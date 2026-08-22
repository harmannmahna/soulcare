"""Run every third-party API through the Swytchcode kernel.

SoulCare never talks to Slack / Resend / Weaviate / Firecrawl / YouTube /
Google Calendar / Cloudinary with a raw SDK first. Calls go:

    FastAPI → swytchcode exec <canonical_id> → provider

If the CLI is missing or a provider key is unset, we still invoke
`swytchcode exec --demo` so the path is Swytchcode either way. Direct
HTTP is only a last-resort fallback after the kernel returns.

Canonical IDs live in `.swytchcode/tooling.json` at the repo root.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any

from app.config import get_settings

logger = logging.getLogger("soulcare.swytchcode")

REPO_ROOT = Path(__file__).resolve().parents[3]

TOOLS = {
    "slack": "slack.chat.postmessage.create",
    "resend": "resend.email.create",
    "telegram": "telegram_v5_0.sendmessage.create",
    "weaviate_graphql": "weaviate.graphql.create",
    "weaviate_object": "weaviate.object.create",
    "firecrawl_search": "firecrawl.search.create",
    "firecrawl_scrape": "firecrawl.scrape.create",
    "youtube_search": "youtube.search.list",
    "gcal_event": "calendar.event.create",
    "cloudinary_upload": "cloudinary.upload.create",
}

HEADER_TOKEN_ALIASES = {"slack"}
TIMEOUT_SEC = 12


def _bin() -> str:
    settings = get_settings()
    if settings.swytchcode_bin:
        return settings.swytchcode_bin
    found = shutil.which("swytchcode") or shutil.which("swy")
    return found or "swytchcode"


def _use_demo(tool: str) -> bool:
    settings = get_settings()
    if settings.swytchcode_demo:
        return True
    mapping = {
        TOOLS["slack"]: bool(settings.slack_bot_token and settings.slack_channel_id),
        TOOLS["resend"]: bool(settings.resend_api_key and settings.ngo_alert_email),
        TOOLS["telegram"]: bool(settings.telegram_bot_token and settings.telegram_chat_id),
        TOOLS["weaviate_graphql"]: bool(settings.weaviate_url),
        TOOLS["weaviate_object"]: bool(settings.weaviate_url),
        TOOLS["firecrawl_search"]: bool(settings.firecrawl_api_key),
        TOOLS["firecrawl_scrape"]: bool(settings.firecrawl_api_key),
        TOOLS["youtube_search"]: bool(settings.youtube_api_key),
        TOOLS["gcal_event"]: bool(settings.google_calendar_token),
        TOOLS["cloudinary_upload"]: bool(settings.cloudinary_url),
    }
    return not mapping.get(tool, False)


def _run_cli(
    tool: str,
    *,
    body: dict | None,
    params: dict | None,
    headers: dict | None,
    inputs: dict | None,
    demo: bool,
) -> dict[str, Any]:
    import subprocess

    cmd = [_bin(), "exec", tool, "--json"]
    if demo:
        cmd.append("--demo")
    if body is not None:
        cmd.extend(["--body", json.dumps(body)])
    for key, value in (params or {}).items():
        if value is None:
            continue
        if isinstance(value, list):
            value = ",".join(str(item) for item in value)
        cmd.extend(["--param", f"{key}={value}"])
    for key, value in (headers or {}).items():
        if value:
            cmd.extend(["--header", f"{key}={value}"])
    for key, value in (inputs or {}).items():
        if value:
            cmd.extend(["--input", f"{key}={value}"])
    env = os.environ.copy()
    env.setdefault("SWYTCHCODE_BIN", _bin())
    timeout = float(os.environ.get("SWYTCHCODE_TIMEOUT", TIMEOUT_SEC))
    proc = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
        env=env,
        check=False,
    )
    stdout = (proc.stdout or "").strip()
    parsed: Any = None
    if stdout:
        try:
            parsed = json.loads(stdout)
        except json.JSONDecodeError:
            parsed = {"raw": stdout[-2000:]}
    return {
        "ok": proc.returncode == 0,
        "demo": demo,
        "tool": tool,
        "returncode": proc.returncode,
        "result": parsed,
        "stderr": (proc.stderr or "")[-1500:],
        "via": "swytchcode",
    }


async def exec_tool(
    alias: str,
    *,
    body: dict | None = None,
    params: dict | None = None,
    extra: dict | None = None,
    headers: dict | None = None,
) -> dict[str, Any]:
    tool = TOOLS.get(alias, alias)
    extra = dict(extra or {})
    headers = dict(headers or {})
    inputs: dict[str, Any] = {}
    token = extra.pop("token", None)
    if token:
        if alias in HEADER_TOKEN_ALIASES or tool.startswith("slack."):
            headers.setdefault("token", token)
        else:
            inputs.setdefault("token", token)
    inputs.update(extra)
    demo = _use_demo(tool)
    try:
        return await asyncio.to_thread(
            _run_cli,
            tool,
            body=body,
            params=params,
            headers=headers,
            inputs=inputs,
            demo=demo,
        )
    except FileNotFoundError:
        logger.warning("swytchcode CLI not on PATH")
        return {"ok": False, "demo": demo, "tool": tool, "error": "cli_missing", "via": "swytchcode"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("swytchcode exec failed: %s", exc)
        return {"ok": False, "demo": demo, "tool": tool, "error": exc.__class__.__name__, "via": "swytchcode"}
