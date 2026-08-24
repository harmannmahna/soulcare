import { useState } from "react";
import { api, apiForm } from "../api/client";

export function useTalkCompanion() {
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState(null);
  const [messages, setMessages] = useState([]);

  async function ensureSession() {
    if (sessionId) return sessionId;
    const data = await api("/api/v1/avatar/session", { method: "POST", body: {} });
    setSessionId(data.session?.id);
    return data.session?.id;
  }

  async function sendTurn(blob, transcriptHint = "") {
    setBusy(true);
    setError("");
    try {
      const sid = await ensureSession();
      const form = new FormData();
      if (blob && blob.size > 0) {
        form.append("audio", blob, blob.type?.includes("wav") ? "turn.wav" : "turn.webm");
      }
      if (sid) form.append("session_id", sid);
      if (transcriptHint) form.append("transcript_hint", transcriptHint);
      const data = await apiForm("/api/v1/avatar/turn", form);
      setSessionId(data.session_id);
      setLast(data);
      const userLine = (data.transcript || transcriptHint || "").trim();
      const next = [];
      if (userLine) next.push({ role: "user", text: userLine });
      if (data.reply) next.push({ role: "assistant", text: data.reply });
      if (next.length) setMessages((m) => [...m, ...next]);
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

  function resetConversation() {
    setMessages([]);
    setLast(null);
    setError("");
    setSessionId(null);
  }

  return { sessionId, busy, error, last, messages, sendTurn, resetConversation };
}
