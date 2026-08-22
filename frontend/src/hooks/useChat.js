import { useState } from "react";
import { api } from "../api/client";

export function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [risk, setRisk] = useState({ tier: "green" });
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ensureSession(channel = "chat") {
    if (sessionId) return sessionId;
    const session = await api("/api/v1/chat/sessions", { method: "POST", body: { channel } });
    setSessionId(session.id);
    return session.id;
  }

  async function send(text, channel = "chat") {
    setBusy(true);
    setError("");
    const optimistic = { role: "user", text };
    setMessages((m) => [...m, optimistic]);
    try {
      const sid = await ensureSession(channel);
      const path = channel === "call" ? "/api/v1/call/turn" : "/api/v1/chat/messages";
      const data = await api(path, { method: "POST", body: { text, session_id: sid } });
      setSessionId(data.session_id);
      setRisk(data.risk);
      setMatches(data.therapists || []);
      setMessages((m) => [...m, { role: "assistant", text: data.reply, risk: data.risk }]);
      return data;
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.slice(0, -1));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return { sessionId, messages, risk, matches, busy, error, send, setMessages };
}

export function useCall() {
  return useChat();
}
