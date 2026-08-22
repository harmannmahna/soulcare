import { useState } from "react";
import { api, apiForm } from "../api/client";

export function useTalkCompanion() {
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState(null);
  const [presenterUrl, setPresenterUrl] = useState("");

  async function loadConfig() {
    const cfg = await api("/api/v1/avatar/config");
    setPresenterUrl(cfg.presenter_url || "");
    return cfg;
  }

  async function ensureSession() {
    if (sessionId) return sessionId;
    const data = await api("/api/v1/avatar/session", { method: "POST", body: {} });
    setSessionId(data.session?.id);
    if (data.presenter_url) setPresenterUrl(data.presenter_url);
    return data.session?.id;
  }

  async function sendTurn(blob, transcriptHint = "") {
    setBusy(true);
    setError("");
    try {
      const sid = await ensureSession();
      const form = new FormData();
      form.append("audio", blob, blob.type?.includes("wav") ? "turn.wav" : "turn.webm");
      if (sid) form.append("session_id", sid);
      if (transcriptHint) form.append("transcript_hint", transcriptHint);
      const data = await apiForm("/api/v1/avatar/turn", form);
      setSessionId(data.session_id);
      setLast(data);
      if (data.presenter_url) setPresenterUrl(data.presenter_url);
      if (data.risk?.checkin_after) {
        window.dispatchEvent(new CustomEvent("soulcare:checkin", { detail: { reason: "yellow" } }));
      }
      return data;
    } catch (err) {
      setError(err.message || "That turn did not go through.");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return { sessionId, busy, error, last, presenterUrl, loadConfig, sendTurn };
}
