export default function CharacterSelector({ characters = [], selectedId, onSelect, compact = false }) {
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
      {characters.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={`glass-panel flex items-center gap-3 p-2 text-left transition ${
              compact ? "rounded-full !p-1 pr-3" : ""
            } ${active ? "ring-2 ring-[var(--accent-blue)]" : "hover:ring-1 hover:ring-[var(--accent-blue-light)]"}`}
          >
            <img
              src={c.avatarUrl}
              alt=""
              className={`rounded-full bg-white object-cover ${compact ? "h-9 w-9" : "h-14 w-14"}`}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {c.name}
              </span>
              {!compact && (
                <span className="block truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {c.nationality} · {c.gender}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
