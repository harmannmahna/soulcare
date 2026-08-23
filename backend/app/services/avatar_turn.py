"""Isolated avatar-call turn. Reuses triage + LLM; does not change chat handle_turn."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.services.alerts import hub
from app.services.ai import get_ai_provider, looks_hinglish, provider_label
from app.services.avatar_risk import combine_tiers, vocal_tier_from_score
from app.services.hume import analyze_audio
from app.services.ngo_notify import notify_red, safety_copy
from app.services.pipeline import ensure_session, match_therapists
from app.services.risk_triage import RiskTier, classify_risk, public_risk_payload
from app.store import store

_AVATAR_MEMORY: dict[str, list[dict]] = {}

_PROBLEM_SITUATION = {
    "anxiety": "anxious / racing thoughts",
    "depression": "low mood / heaviness",
    "relationship": "relationship strain",
    "academic": "exams / study pressure",
    "grief": "grief or loss",
    "work_stress": "work / burnout pressure",
    "family": "family stress",
    "loneliness": "loneliness / isolation",
    "trauma": "something traumatic resurfacing",
    "sleep": "sleep trouble",
    "addiction": "habit / craving struggle",
    "identity": "identity / belonging questions",
    "general": "general stress",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _eid() -> str:
    return f"av_{uuid.uuid4().hex[:10]}"


def _emotion_phrase(emotions: list[dict] | None) -> str:
    rows: list[str] = []
    for item in emotions or []:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        try:
            score = float(item.get("score") or 0)
        except (TypeError, ValueError):
            score = 0.0
        if score < 0.12:
            continue
        rows.append(f"{name} ({score:.2f})")
        if len(rows) >= 4:
            break
    return ", ".join(rows)


def build_voice_situation_context(
    *,
    transcript: str,
    effective: Any,
    vocal_score: float | None,
    vocal_tier: RiskTier | None,
    emotions: list[dict] | None,
) -> str:
    """Ground the spoken reply in triage + vocal tone so it fits the moment."""
    lines = [
        "Voice-call situation notes (use these; do not recite them verbatim):",
    ]
    problem = getattr(getattr(effective, "problem_type", None), "value", None) or "general"
    situation = _PROBLEM_SITUATION.get(problem, problem.replace("_", " "))
    lines.append(f"- Likely situation from their words: {situation}.")
    tags = [t for t in (getattr(effective, "tags", None) or []) if t]
    if tags:
        lines.append(f"- Relevant themes: {', '.join(tags[:5])}.")
    matched = getattr(effective, "matched_phrase", None)
    if matched:
        lines.append(f"- They touched on: “{str(matched)[:80]}”.")

    emotion_bit = _emotion_phrase(emotions)
    if emotion_bit:
        lines.append(f"- Voice tone (prosody): {emotion_bit}.")
    if vocal_score is not None:
        lines.append(f"- Vocal distress score: {float(vocal_score):.2f} (0 calm → 1 distressed).")
    if vocal_tier is not None:
        lines.append(f"- Vocal risk read: {vocal_tier.value}.")

    text_calm = (getattr(effective, "tier", None) == RiskTier.GREEN) and not matched
    voice_hot = vocal_tier in (RiskTier.YELLOW, RiskTier.RED) or (
        vocal_score is not None and float(vocal_score) >= 0.40
    )
    if text_calm and voice_hot:
        lines.append(
            "- Words sound composed but the voice carries distress — gently notice that gap "
            "and invite one honest line about what is underneath."
        )
    elif voice_hot:
        lines.append(
            "- Their voice sounds strained — acknowledge the feeling in the body/voice before advice."
        )

    snippet = " ".join((transcript or "").split())[:160]
    if snippet:
        lines.append(f'- They said: “{snippet}”.')
    lines.append(
        "Reply as if you understood this exact situation. Lead with reflection, then one "
        "specific next step or question tied to it — never a generic wellness script."
    )
    return "\n".join(lines)


async def run_avatar_turn(
    *,
    user: dict,
    audio: bytes,
    filename: str,
    content_type: str,
    session_id: str | None,
    transcript_hint: str | None = None,
) -> dict:
    session = await ensure_session(
        user_id=user["id"],
        guest=bool(user.get("guest")),
        channel="avatar",
        consent=True,
        session_id=session_id,
    )

    hume = await analyze_audio(audio, filename=filename, content_type=content_type)
    transcript = (hume.get("transcript") or "").strip() or (transcript_hint or "").strip()
    vocal_score = hume.get("vocal_score")
    vocal_tier = vocal_tier_from_score(float(vocal_score)) if vocal_score is not None else None

    if not transcript:
        return {
            "session_id": session["id"],
            "ok": False,
            "error": "We couldn't hear a clear sentence. Try speaking a little longer.",
            "hume_ok": bool(hume.get("ok")),
            "transcript": "",
        }

    text_result = classify_risk(transcript)
    final_tier = combine_tiers(text_result.tier, vocal_tier)

    # Escalate the RiskResult only when vocal is worse; never rewrite classify_risk.
    effective = text_result
    if final_tier != text_result.tier:
        from app.services.risk_triage import RED_SAFETY_MESSAGE, INDIA_HELPLINES, RiskResult

        if final_tier == RiskTier.RED:
            effective = RiskResult(
                tier=RiskTier.RED,
                problem_type=text_result.problem_type,
                triggered_rule="hume_vocal_distress",
                matched_phrase=None,
                action="emergency_escalation",
                tags=list(text_result.tags or []),
                safety_message=RED_SAFETY_MESSAGE,
                helplines=list(INDIA_HELPLINES),
                model_label=text_result.model_label,
                model_confidence=text_result.model_confidence,
                model_probs=text_result.model_probs,
                sources=list(text_result.sources or []) + ["hume_vocal"],
            )
        elif final_tier == RiskTier.YELLOW:
            effective = RiskResult(
                tier=RiskTier.YELLOW,
                problem_type=text_result.problem_type,
                triggered_rule=text_result.triggered_rule or "hume_vocal_agitation",
                matched_phrase=text_result.matched_phrase,
                action="companion_plus_therapist_match",
                tags=list(text_result.tags or []),
                model_label=text_result.model_label,
                model_confidence=text_result.model_confidence,
                model_probs=text_result.model_probs,
                sources=list(text_result.sources or []) + ["hume_vocal"],
            )
    elif vocal_tier is not None and "hume_vocal" not in (effective.sources or []):
        from app.services.risk_triage import RiskResult

        effective = RiskResult(
            tier=effective.tier,
            problem_type=effective.problem_type,
            triggered_rule=effective.triggered_rule,
            matched_phrase=effective.matched_phrase,
            action=effective.action,
            tags=list(effective.tags or []),
            safety_message=effective.safety_message,
            helplines=list(effective.helplines or []),
            model_label=effective.model_label,
            model_confidence=effective.model_confidence,
            model_probs=effective.model_probs,
            sources=list(effective.sources or []) + ["hume_vocal"],
        )

    public = public_risk_payload(effective)
    event = {
        "id": _eid(),
        "session_id": session["id"],
        "user_id": session.get("user_id"),
        "channel": "avatar",
        "tier": effective.tier.value,
        "text_tier": text_result.tier.value,
        "vocal_tier": vocal_tier.value if vocal_tier else None,
        "vocal_score": vocal_score,
        "triggered_rule": effective.triggered_rule,
        "action": effective.action,
        "problem_type": effective.problem_type.value,
        "model_label": effective.model_label,
        "model_confidence": effective.model_confidence,
        "sources": effective.sources,
        "hume_ok": bool(hume.get("ok")),
        "created_at": _now(),
    }

    if effective.tier == RiskTier.RED:
        ngo = await notify_red(
            session_id=session["id"],
            user_id=session.get("user_id"),
            event_id=event["id"],
            triggered_rule=effective.triggered_rule,
        )
        event["notifiedChannel"] = ngo["notifiedChannel"]
        event["notifiedAt"] = ngo["notifiedAt"]
        event["ngo_name"] = ngo["ngo_name"]
        await store.collection("risk_events").insert_one(event)
        await store.collection("sessions").update_one(
            {"id": session["id"]},
            {
                "$set": {
                    "last_tier": "red",
                    "peak_tier": "red",
                    "last_action": effective.action,
                    "channel": "avatar",
                    "summary": "Avatar call · crisis. LLM skipped. No spoken reply.",
                },
                "$inc": {"turn_count": 1},
            },
        )
        await hub.broadcast(
            {
                "type": "red_alert",
                "session_id": session["id"],
                "user_id": session.get("user_id"),
                "tier": "red",
                "triggered_rule": effective.triggered_rule,
                "action": effective.action,
                "created_at": event["created_at"],
                "notifiedChannel": ngo["notifiedChannel"],
                "notifiedAt": ngo["notifiedAt"],
                "ngo_name": ngo["ngo_name"],
            }
        )
        reply = safety_copy(ngo["ngo_name"])
        public["safety_message"] = reply
        public["notifiedChannel"] = ngo["notifiedChannel"]
        public["notifiedAt"] = ngo["notifiedAt"]
        public["ngo_name"] = ngo["ngo_name"]
        return {
            "ok": True,
            "session_id": session["id"],
            "risk": public,
            "reply": reply,
            "llm_used": False,
            "ai_backend": "safety_script",
            "speak": False,
            "transcript": transcript,
            "therapists": [],
            "hume_ok": bool(hume.get("ok")),
            "vocal_score": vocal_score,
            "text_tier": text_result.tier.value,
            "vocal_tier": vocal_tier.value if vocal_tier else None,
        }

    await store.collection("risk_events").insert_one(event)
    peak = session.get("peak_tier") or "green"
    order = {"green": 0, "yellow": 1, "red": 2}
    if order.get(effective.tier.value, 0) > order.get(peak, 0):
        peak = effective.tier.value
    await store.collection("sessions").update_one(
        {"id": session["id"]},
        {
            "$set": {
                "last_tier": effective.tier.value,
                "peak_tier": peak,
                "last_action": effective.action,
                "channel": "avatar",
                "summary": f"avatar · {effective.tier.value}",
            },
            "$inc": {"turn_count": 1},
        },
    )

    history = _AVATAR_MEMORY.setdefault(session["id"], [])
    situation = build_voice_situation_context(
        transcript=transcript,
        effective=effective,
        vocal_score=float(vocal_score) if vocal_score is not None else None,
        vocal_tier=vocal_tier,
        emotions=hume.get("emotions") if isinstance(hume.get("emotions"), list) else None,
    )
    reply = await get_ai_provider().generate(
        transcript,
        yellow=effective.tier == RiskTier.YELLOW,
        hinglish=looks_hinglish(transcript),
        history=history,
        extra_context=situation,
        spoken=True,
    )
    history.append({"role": "user", "text": transcript[:500]})
    history.append({"role": "assistant", "text": reply[:800]})
    if len(history) > 12:
        del history[:-12]

    therapists = []
    if effective.tier == RiskTier.YELLOW:
        therapists = await match_therapists(effective.tags, query=transcript)
        public["checkin_after"] = True

    return {
        "ok": True,
        "session_id": session["id"],
        "risk": public,
        "reply": reply,
        "llm_used": True,
        "ai_backend": provider_label(),
        "speak": True,
        "transcript": transcript,
        "therapists": therapists,
        "hume_ok": bool(hume.get("ok")),
        "hume_error": None if hume.get("ok") else hume.get("error"),
        "vocal_score": vocal_score,
        "text_tier": text_result.tier.value,
        "vocal_tier": vocal_tier.value if vocal_tier else None,
    }
