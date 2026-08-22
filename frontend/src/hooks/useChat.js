import { useState } from "react";
import { api } from "../api/client";

export function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [risk, setRisk] = useState({ tier: "green" });
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [historyNote, setHistoryNote] = useState(null);
  const [aiBackend, setAiBackend] = useState("");
  const [actions, setActions] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [ended, setEnded] = useState(null);

  async function refreshSessions() {
    try {
      const rows = await api("/api/v1/chat/sessions");
      setSessions(rows);
      return rows;
    } catch {
      return [];
    }
  }

  async function ensureSession(channel = "chat", characterId) {
    if (sessionId) return sessionId;
    const session = await api("/api/v1/chat/sessions", {
      method: "POST",
      body: { channel, character_id: characterId },
    });
    setSessionId(session.id);
    setHistoryNote(null);
    setEnded(null);
    refreshSessions();
    return session.id;
  }

  async function newChat(channel = "chat", characterId) {
    const session = await api("/api/v1/chat/sessions", {
      method: "POST",
      body: { channel, character_id: characterId },
    });
    setSessionId(session.id);
    setMessages([]);
    setRisk({ tier: "green" });
    setMatches([]);
    setHistoryNote(null);
    setAiBackend("");
    setError("");
    setActions([]);
    setEnded(null);
    refreshSessions();
    return session.id;
  }

  async function openSession(row) {
    setSessionId(row.id);
    setMessages([]);
    setMatches([]);
    setRisk({ tier: row.last_tier || row.peak_tier || "green" });
    setHistoryNote({
      started_at: row.started_at || row.created_at,
      peak_tier: row.peak_tier || row.last_tier,
      last_tier: row.last_tier,
      summary: row.summary,
      last_companion_preview: row.last_companion_preview,
      turn_count: row.turn_count,
    });
    setEnded(null);
  }

  async function send(text, channel = "chat", extras = {}) {
    setBusy(true);
    setError("");
    const optimistic = { role: "user", text };
    setMessages((m) => [...m, optimistic]);
    try {
      const sid = await ensureSession(channel, extras.character_id);
      const path = channel === "call" ? "/api/v1/call/turn" : "/api/v1/chat/messages";
      const data = await api(path, {
        method: "POST",
        body: {
          text,
          session_id: sid,
          character_id: extras.character_id,
          vocal_features: extras.vocal_features || undefined,
        },
      });
      setSessionId(data.session_id);
      setRisk(data.risk);
      setMatches(data.therapists || []);
      if (data.ai_backend) setAiBackend(data.ai_backend);
      setActions(data.actions || []);
      if (data.open_tasks) setOpenTasks(data.open_tasks);
      setMessages((m) => [...m, { role: "assistant", text: data.reply, risk: data.risk }]);
      if (data.risk?.tier === "yellow") {
        sessionStorage.setItem("sc_last_problem", text);
      }
      if (data.risk?.checkin_after) {
        window.dispatchEvent(new CustomEvent("soulcare:checkin", { detail: { reason: "yellow" } }));
      }
      refreshSessions();
      return data;
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.slice(0, -1));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function closeIdle(reason = "idle") {
    if (!sessionId) return null;
    try {
      const data = await api("/api/v1/companion/close", {
        method: "POST",
        body: { session_id: sessionId, reason },
      });
      setEnded(data);
      setSessionId(null);
      refreshSessions();
      return data;
    } catch {
      setEnded({
        goodbye: "I'll let you go for now. Take care of yourself today.",
        quote: "You do not have to solve everything before you put the phone down.",
      });
      return null;
    }
  }

  return {
    sessionId,
    messages,
    risk,
    matches,
    busy,
    error,
    send,
    setMessages,
    sessions,
    refreshSessions,
    newChat,
    openSession,
    historyNote,
    aiBackend,
    actions,
    openTasks,
    setOpenTasks,
    ended,
    setEnded,
    closeIdle,
  };
}

export function useCall() {
  return useChat();
}
