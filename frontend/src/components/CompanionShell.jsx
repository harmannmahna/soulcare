import { Link } from "react-router-dom";
import { BreathingOrb } from "./visuals";
import CharacterSelector from "./CharacterSelector";

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function CompanionShell({
  mode = "chat",
  character,
  characters,
  onSelectCharacter,
  status = "Ready",
  busy = false,
  listening = false,
  drawerOpen,
  onToggleDrawer,
  tasks = [],
  summaries = [],
  sessions = [],
  sessionId,
  onOpenSession,
  onNewSession,
  ended,
  onDismissEnd,
  children,
}) {
  const active = busy || listening;
  return (
    <div className="companion-root">
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CharacterSelector characters={characters} selectedId={character?.id} onSelect={onSelectCharacter} compact />
          <div className="flex items-center gap-2">
            <button type="button" className="glass-panel px-3 py-2 text-xs font-semibold" onClick={onNewSession}>
              New session
            </button>
            <button type="button" className="glass-panel px-3 py-2 text-xs font-semibold" onClick={onToggleDrawer}>
              {drawerOpen ? "Hide sidebar" : "Tasks & memory"}
            </button>
            <Link to="/dashboard" className="glass-panel px-3 py-2 text-xs font-semibold">
              Dashboard
            </Link>
          </div>
        </div>

        {ended && (
          <div className="glass-panel mx-auto max-w-xl p-6 text-center">
            <p className="text-lg font-semibold">{ended.goodbye}</p>
            <p className="mt-3 text-sm italic" style={{ color: "var(--text-muted)" }}>
              “{ended.quote}”
            </p>
            {ended.summary && (
              <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                Saved summary: {ended.summary}
              </p>
            )}
            <button type="button" className="mt-5 rounded-full bg-[var(--accent-blue)] px-5 py-2 text-sm text-white" onClick={onDismissEnd}>
              Talk again
            </button>
          </div>
        )}

        <div className={`grid gap-4 ${drawerOpen ? "lg:grid-cols-[1fr_300px]" : ""}`}>
          <div className="space-y-4">
            <div className="relative mx-auto flex max-w-md flex-col items-center pt-4">
              <div className={`companion-orb-glow ${active ? "active" : ""}`} />
              {character?.avatarUrl ? (
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="relative z-10 h-28 w-28 rounded-full bg-mist shadow-[0_0_40px_rgba(135,237,168,0.35)]"
                />
              ) : (
                <BreathingOrb active={active} risk="green" tone="sage" className="relative z-10 h-28 w-28" />
              )}
              <p className="relative z-10 mt-3 text-lg font-semibold">{character?.name || "Companion"}</p>
              <p className="relative z-10 text-xs" style={{ color: "var(--text-muted)" }}>
                {status}
              </p>
            </div>
            {children}
          </div>

          {drawerOpen && (
            <aside className="space-y-4">
              <div className="glass-panel p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-blue-deep)" }}>
                  Today’s checklist
                </p>
                {tasks.length === 0 && (
                  <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    No open habits due today.
                  </p>
                )}
                <ul className="mt-3 space-y-2">
                  {tasks.map((t) => (
                    <li key={t.id} className="rounded-2xl bg-mist/80 px-3 py-2 text-sm">
                      {t.title || t.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-panel p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-blue-deep)" }}>
                  Past conversations
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Summaries only — raw messages are not stored.
                </p>
                <div className="mt-3 max-h-[38vh] space-y-2 overflow-y-auto">
                  {(summaries.length ? summaries : sessions).map((s) => (
                    <button
                      key={s.id || s.session_id}
                      type="button"
                      onClick={() => s.id && onOpenSession?.(s)}
                      className={`w-full rounded-2xl bg-mist/70 px-3 py-2 text-left text-sm ${
                        sessionId && (sessionId === s.id || sessionId === s.session_id) ? "ring-1 ring-[var(--accent-blue)]" : ""
                      }`}
                    >
                      <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {fmtWhen(s.created_at || s.started_at || s.date)}
                      </span>
                      <span className="mt-1 block text-xs">{s.summary || "Session"}</span>
                    </button>
                  ))}
                </div>
              </div>
              {mode === "chat" && (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Idle for 30 seconds and the session closes with a warm goodbye.
                </p>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
