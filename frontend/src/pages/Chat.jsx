import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CompanionShell from "../components/CompanionShell";
import CharacterSelector from "../components/CharacterSelector";
import { RiskBanner } from "../components/shell";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";

const IDLE_MS = 30000;

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
    actions,
    openTasks,
    setOpenTasks,
    ended,
    setEnded,
    closeIdle,
  } = useChat();
  const { user, updateProfile, refresh } = useAuth();
  const [text, setText] = useState("");
  const [characters, setCharacters] = useState([]);
  const [character, setCharacter] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [picking, setPicking] = useState(false);
  const idleRef = useRef(null);
  const lastInputRef = useRef(Date.now());

  async function loadContext() {
    try {
      const [chars, ctx] = await Promise.all([api("/api/v1/companion/characters"), api("/api/v1/companion/context")]);
      setCharacters(chars.characters || []);
      setCharacter(ctx.character);
      setOpenTasks(ctx.open_tasks || []);
      setSummaries(ctx.summaries || []);
      setPicking(true);
    } catch {
      /* companion still works with chat-only endpoints */
    }
  }

  useEffect(() => {
    refreshSessions();
    loadContext();
  }, []);

  useEffect(() => {
    function resetTimer() {
      lastInputRef.current = Date.now();
      if (idleRef.current) window.clearTimeout(idleRef.current);
      if (!sessionId || ended || picking) return;
      idleRef.current = window.setTimeout(() => {
        closeIdle("idle");
      }, IDLE_MS);
    }
    resetTimer();
    return () => idleRef.current && window.clearTimeout(idleRef.current);
  }, [sessionId, messages, picking, ended]);

  async function onSelectCharacter(next) {
    setCharacter(next);
    setPicking(false);
    try {
      await api("/api/v1/companion/preferences", { method: "PATCH", body: { selected_character_id: next.id } });
      await updateProfile({ selected_character_id: next.id });
      await refresh();
    } catch {
      /* local selection still applies for this session */
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!text.trim() || ended) return;
    const next = text;
    setText("");
    lastInputRef.current = Date.now();
    await send(next, "chat", { character_id: character?.id }).catch(() => setText(next));
    loadContext();
  }

  const status = ended ? "Session closed" : busy ? "Thinking..." : messages.length ? "With you" : "Ready when you are";

  return (
    <CompanionShell
      mode="chat"
      character={character}
      characters={characters}
      onSelectCharacter={onSelectCharacter}
      status={status}
      busy={busy}
      drawerOpen={drawerOpen}
      onToggleDrawer={() => setDrawerOpen((v) => !v)}
      tasks={openTasks}
      summaries={summaries}
      sessions={sessions}
      sessionId={sessionId}
      onOpenSession={openSession}
      onNewSession={() => {
        setEnded(null);
        newChat("chat", character?.id);
      }}
      ended={ended}
      onDismissEnd={() => {
        setEnded(null);
        newChat("chat", character?.id);
      }}
    >
      {picking && messages.length === 0 && !historyNote && (
        <div className="glass-panel p-5">
          <h2 className="text-xl font-semibold">Who do you want to talk with?</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Same calm support — different voice and presence. Your last choice is remembered.
          </p>
          <div className="mt-4">
            <CharacterSelector characters={characters} selectedId={character?.id} onSelect={onSelectCharacter} />
          </div>
        </div>
      )}

      <div className="glass-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Talk to your companion</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              If things stay light, we talk. If they get serious, we suggest a therapist. If they are critical, we stop
              the AI, alert a partner NGO, and show helplines.
            </p>
            {aiBackend === "mock" && (
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                Demo companion is on (no Gemini key). Replies follow what you typed.
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <RiskBanner tier={risk.tier} />
        </div>
        {historyNote && messages.length === 0 && (
          <div className="mt-4 rounded-2xl bg-mist/80 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--accent-blue-deep)" }}>
              Saved summary
            </p>
            <p className="mt-1 font-semibold">{historyNote.summary || "Earlier session"}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Transcript is not kept. Send a message to continue.
            </p>
          </div>
        )}
        <div className="mt-5 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !historyNote && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Use the <strong>User</strong> login (<code>demo@soulcare.app</code>). Therapist cards appear only on{" "}
                <strong>yellow</strong>.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Green", "I want to start meditating after work"],
                  ["Yellow · match", "JEE exam stress is crushing me"],
                  ["Red · stop AI", "I want to kill myself"],
                  ["Task", "yeah I did it, finished the GATE mock"],
                  ["Period", "I got my period today"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full bg-mist px-3 py-1 text-xs"
                    style={{ color: "var(--accent-blue-deep)" }}
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
                m.role === "user"
                  ? "ml-auto text-sand"
                  : "bg-mist/80"
              }`}
              style={m.role === "user" ? { background: "var(--accent-blue)" } : { color: "var(--text-primary)" }}
            >
              {m.text}
            </motion.div>
          ))}
        </div>
        {actions?.length > 0 && (
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Actions this turn: {actions.map((a) => a.tool).join(", ")}
          </p>
        )}
        {risk.tier === "red" && (
          <div className="mt-4 space-y-2">
            {risk.ngo_name && (
              <p className="text-sm text-rose">
                High priority. We alerted {risk.ngo_name}
                {risk.notifiedChannel ? ` via ${risk.notifiedChannel}` : ""}. Please call 112 or Tele-MANAS 14416.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <a href="tel:112" className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white">
                Call 112
              </a>
              <a href="tel:14416" className="rounded-full bg-amber-500 px-4 py-2 text-sm text-white">
                Call Tele-MANAS 14416
              </a>
            </div>
          </div>
        )}
        {matches.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-blue-deep)" }}>
              Matched care
            </p>
            {matches.map((t) => (
              <Link key={t.id} to={`/therapists/${t.id}`} className="block rounded-2xl bg-mist/80 p-3">
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {(t.tags || t.specialties || []).join(" · ")}
                </p>
                {(t.match_reason || t.reason) && (
                  <p className="mt-1 text-xs" style={{ color: "var(--accent-blue-deep)" }}>
                    {t.match_reason || t.reason}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
        <form className="mt-5 flex gap-2" onSubmit={onSubmit}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              lastInputRef.current = Date.now();
            }}
            placeholder="Share what’s here…"
            className="flex-1 rounded-2xl border border-white/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
            disabled={!!ended}
          />
          <button
            type="submit"
            disabled={busy || !!ended}
            className="rounded-2xl bg-[var(--accent-blue)] px-5 py-3 text-sm font-semibold text-sand disabled:opacity-50"
          >
            {busy ? "…" : "Send"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}
      </div>
    </CompanionShell>
  );
}
