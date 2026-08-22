import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BreathingOrb, Particles } from "../components/visuals";
import { Button, Card, Badge } from "../components/ui";
import { RiskBanner } from "../components/shell";
import { useChat } from "../hooks/useChat";

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** Talk Now — plain text chat. No character faces / avatar picker. */
export default function Chat() {
  const {
    messages,
    risk,
    matches,
    busy,
    error,
    send,
    sessions,
    refreshSessions,
    newChat,
    openSession,
    sessionId,
    historyNote,
    aiBackend,
  } = useChat();
  const [text, setText] = useState("");

  useEffect(() => {
    refreshSessions();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const next = text;
    setText("");
    await send(next, "chat").catch(() => setText(next));
  }

  return (
    <div className="relative grid gap-5 lg:grid-cols-[240px_1fr_280px]">
      <Particles count={18} />
      <aside className="relative z-10 space-y-3">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage">Sessions</p>
            <Button className="!px-3 !py-1 text-xs" onClick={() => newChat("chat")}>
              New chat
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-ink/50">Summaries only — raw messages are not stored.</p>
          <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto">
            {sessions.length === 0 && <p className="text-sm text-ink/50">No past sessions yet.</p>}
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSession(s)}
                className={`w-full rounded-2xl px-3 py-2 text-left text-sm ${
                  sessionId === s.id ? "bg-mist ring-1 ring-moss/30" : "bg-sand hover:bg-mist"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-ink/55">{fmtWhen(s.started_at || s.created_at)}</span>
                  <Badge tone={s.peak_tier || s.last_tier || "sage"}>{s.peak_tier || s.last_tier || "—"}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-sage">{s.summary || "Session"}</p>
              </button>
            ))}
          </div>
        </Card>
      </aside>

      <Card className="relative z-10 min-h-[70vh]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Talk now</h1>
            <p className="mt-1 text-sm text-ink/60">
              If things stay light, we talk. If they get serious, we suggest a therapist. If they are critical, we stop
              the AI, alert a partner NGO, and show helplines.
            </p>
            {aiBackend === "mock" && (
              <p className="mt-2 text-xs text-ink/45">
                Demo companion is on (no Gemini key). Replies follow what you typed — for a full LLM, set{" "}
                <code>GEMINI_API_KEY</code> in <code>backend/.env</code>, then restart uvicorn.
              </p>
            )}
          </div>
          <BreathingOrb active={busy} risk={risk?.tier || "green"} className="h-24 w-24 shrink-0" />
        </div>

        <div className="mt-4">
          <RiskBanner tier={risk?.tier || "green"} />
        </div>

        {historyNote && messages.length === 0 && (
          <div className="mt-4 rounded-2xl bg-mist/80 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-sage">Saved summary</p>
            <p className="mt-1 font-semibold">{historyNote.summary || "Earlier session"}</p>
            <p className="mt-1 text-ink/60">
              Peak risk: {historyNote.peak_tier || historyNote.last_tier} · {historyNote.turn_count || 0} turns
            </p>
            {historyNote.last_companion_preview && (
              <p className="mt-2 italic text-ink/70">“{historyNote.last_companion_preview}”</p>
            )}
            <p className="mt-2 text-[11px] text-ink/45">Transcript is not kept. Send a message to continue.</p>
          </div>
        )}

        <div className="mt-5 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !historyNote && (
            <div className="space-y-2">
              <p className="text-sm text-ink/55">
                Use the <strong>User</strong> login. Therapist cards appear only on <strong>yellow</strong> — a green
                “hi” will not recommend anyone.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Green", "I want to start meditating after work"],
                  ["Yellow · match", "JEE exam stress is crushing me"],
                  ["Red · stop AI", "I want to kill myself"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full bg-mist px-3 py-1 text-xs text-sage"
                    onClick={() => setText(sample)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user" ? "ml-auto bg-moss text-sand" : "bg-mist/80 text-ink"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
        </div>

        {risk?.tier === "red" && (
          <div className="mt-4 space-y-2">
            {risk.ngo_name && (
              <p className="text-sm text-rose">
                High priority. We alerted {risk.ngo_name}
                {risk.notifiedChannel ? ` via ${risk.notifiedChannel}` : ""}. Please call 112 or Tele-MANAS 14416.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <a href="tel:112">
                <Button variant="danger">Call 112</Button>
              </a>
              <a href="tel:14416">
                <Button variant="amber">Call Tele-MANAS 14416</Button>
              </a>
            </div>
          </div>
        )}

        <form className="mt-5 flex gap-2" onSubmit={onSubmit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share what’s here…"
            className="field flex-1"
            disabled={busy}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Send"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}
      </Card>

      <aside className="relative z-10 space-y-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage">Matched care</p>
          {matches.length === 0 && (
            <p className="mt-2 text-sm text-ink/55">Yellow-tier chats surface specialists here.</p>
          )}
          {matches.map((t) => (
            <Link key={t.id} to={`/therapists/${t.id}`} className="mt-3 block rounded-2xl bg-mist/80 p-3">
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-ink/60">{(t.tags || t.specialties || []).join(" · ")}</p>
              {(t.match_reason || t.reason) && (
                <p className="mt-1 text-xs text-sage">{t.match_reason || t.reason}</p>
              )}
              {t.price_inr != null && (
                <p className="text-xs text-sage">
                  ₹{t.price_inr}
                  {t.city ? ` · ${t.city}` : ""}
                </p>
              )}
            </Link>
          ))}
        </Card>
      </aside>
    </div>
  );
}
