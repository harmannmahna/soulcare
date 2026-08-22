import { useEffect, useRef, useState } from "react";
import CompanionShell from "../components/CompanionShell";
import { RiskBanner } from "../components/shell";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { estimateVocalFeatures, speakWithCharacter } from "../lib/companionVoice";

const IDLE_MS = 30000;

export default function Call() {
  const { messages, risk, busy, send, newChat, closeIdle, ended, setEnded, sessionId, openTasks, setOpenTasks } = useChat();
  const { user, updateProfile } = useAuth();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [characters, setCharacters] = useState([]);
  const [character, setCharacter] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const recRef = useRef(null);
  const idleRef = useRef(null);
  const startedAt = useRef(0);

  async function loadContext() {
    try {
      const [chars, ctx] = await Promise.all([api("/api/v1/companion/characters"), api("/api/v1/companion/context")]);
      setCharacters(chars.characters || []);
      setCharacter(ctx.character || characters[0]);
      setOpenTasks(ctx.open_tasks || []);
      setSummaries(ctx.summaries || []);
    } catch {
      /* still usable */
    }
  }

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      setStatus("Speaking...");
      speakWithCharacter(last.text, character);
    }
  }, [messages, character]);

  useEffect(() => {
    if (idleRef.current) window.clearTimeout(idleRef.current);
    if (!sessionId || ended || listening) return;
    idleRef.current = window.setTimeout(() => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      closeIdle("idle");
    }, IDLE_MS);
    return () => idleRef.current && window.clearTimeout(idleRef.current);
  }, [sessionId, messages, ended, listening]);

  async function onSelectCharacter(next) {
    setCharacter(next);
    try {
      await api("/api/v1/companion/preferences", { method: "PATCH", body: { selected_character_id: next.id } });
      await updateProfile({ selected_character_id: next.id });
    } catch {
      /* keep local */
    }
  }

  function toggle() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      send("I feel a bit anxious today", "call", { character_id: character?.id });
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      setStatus("Thinking...");
      return;
    }
    const rec = new SR();
    rec.lang = character?.voiceLang || "en-IN";
    rec.interimResults = false;
    startedAt.current = Date.now();
    rec.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      const words = spoken.trim().split(/\s+/).filter(Boolean).length;
      const vocal_features = estimateVocalFeatures({
        durationMs: Date.now() - startedAt.current,
        wordCount: words,
        rmsVariance: 22,
        pauseRatio: 0.18,
      });
      setStatus("Thinking...");
      send(spoken, "call", { character_id: character?.id, vocal_features });
    };
    rec.onend = () => {
      setListening(false);
      if (!busy) setStatus("Ready");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setStatus("Listening...");
  }

  const live = ended ? "Session closed" : listening ? "Listening..." : busy ? "Thinking..." : status;

  return (
    <CompanionShell
      mode="call"
      character={character}
      characters={characters}
      onSelectCharacter={onSelectCharacter}
      status={live}
      busy={busy}
      listening={listening}
      drawerOpen={drawerOpen}
      onToggleDrawer={() => setDrawerOpen((v) => !v)}
      tasks={openTasks}
      summaries={summaries}
      onNewSession={() => {
        setEnded(null);
        newChat("call", character?.id);
      }}
      ended={ended}
      onDismissEnd={() => {
        setEnded(null);
        newChat("call", character?.id);
      }}
    >
      <div className="glass-panel mx-auto max-w-xl p-6 text-center">
        <h1 className="text-2xl font-semibold">Voice companion</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Same risk pipeline as chat. {character?.name || "Your companion"} speaks in their own pacing.
        </p>
        <div className="mt-3">
          <RiskBanner tier={risk.tier} />
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={!!ended}
            className="rounded-full bg-[var(--accent-blue)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {listening ? "Stop listening" : "Hold space / speak"}
          </button>
          {risk.tier === "red" && (
            <a href="tel:14416" className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white">
              Call 14416
            </a>
          )}
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          No Web Speech API? A demo line is sent instead. Silence for 30 seconds ends the session.
        </p>
        <div className="mt-6 space-y-2 text-left text-sm">
          {messages.slice(-4).map((m, i) => (
            <p key={i} style={{ color: m.role === "user" ? "var(--accent-blue-deep)" : "var(--text-primary)" }}>
              <strong>{m.role === "user" ? "You" : character?.name || "Companion"}:</strong> {m.text}
            </p>
          ))}
        </div>
        {user?.name && (
          <p className="mt-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Signed in as {user.name}
          </p>
        )}
      </div>
    </CompanionShell>
  );
}
