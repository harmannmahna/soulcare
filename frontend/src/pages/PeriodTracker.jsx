import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

function daysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const pad = first.getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let d = 1; d <= last; d += 1) cells.push(new Date(year, month, d).toISOString().slice(0, 10));
  return cells;
}

export default function PeriodTracker() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [cycle, setCycle] = useState(28);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const dragging = useRef(false);
  const mode = useRef("add");

  async function load() {
    const row = await api("/api/v1/period");
    setData(row);
    if (row.cycle_length) setCycle(row.cycle_length);
  }
  useEffect(() => {
    load();
  }, []);

  const marked = useMemo(() => new Set(data?.days || []), [data]);
  const cells = useMemo(() => daysInMonth(cursor.y, cursor.m), [cursor]);

  async function persist(nextDays) {
    const sorted = [...nextDays].sort();
    setData((d) => ({ ...(d || {}), days: sorted, tracked: true }));
    await api("/api/v1/period", {
      method: "POST",
      body: { days: sorted, cycle_length: Number(cycle) || 28, period_length: Math.min(8, sorted.length || 5) },
    });
  }

  function paint(day) {
    if (!day) return;
    const next = new Set(marked);
    if (mode.current === "add") next.add(day);
    else next.delete(day);
    persist(next);
  }

  if (user && String(user.gender || "").toLowerCase() !== "female") {
    return <Navigate to="/dashboard" replace />;
  }

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">Period tracker</h1>
      <p className="mt-2 text-sm text-ink/60">
        Tap or drag across the calendar to mark bleeding days. Typical cycles run 22–35 days — yours does not have to be 28.
      </p>
      <Card className="mt-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCursor({ y: cursor.m === 0 ? cursor.y - 1 : cursor.y, m: (cursor.m + 11) % 12 })}>
            ←
          </button>
          <p className="font-display text-2xl">{monthLabel}</p>
          <button type="button" onClick={() => setCursor({ y: cursor.m === 11 ? cursor.y + 1 : cursor.y, m: (cursor.m + 1) % 12 })}>
            →
          </button>
        </div>
        <div
          className="mt-4 grid grid-cols-7 gap-1 select-none"
          onMouseLeave={() => {
            dragging.current = false;
          }}
        >
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d} className="text-center text-[11px] text-ink/40">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <button
              key={day || `e-${i}`}
              type="button"
              disabled={!day}
              onMouseDown={() => {
                if (!day) return;
                dragging.current = true;
                mode.current = marked.has(day) ? "remove" : "add";
                paint(day);
              }}
              onMouseEnter={() => {
                if (dragging.current) paint(day);
              }}
              onMouseUp={() => {
                dragging.current = false;
              }}
              className={`h-10 rounded-xl text-sm ${
                !day ? "invisible" : marked.has(day) ? "bg-rose text-white" : "bg-sand hover:bg-mist"
              }`}
            >
              {day ? Number(day.slice(-2)) : ""}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-[8rem]">
          <Input label="Cycle length (days)" type="number" min="22" max="40" value={cycle} onChange={(e) => setCycle(e.target.value)} />
        </div>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => persist(marked)}
        >
          Save cycle length
        </Button>
        {data?.next_start && (
          <p className="mt-3 text-sm text-sage">Next expected start around {data.next_start}. Day in cycle: {data.day_in_cycle}.</p>
        )}
      </Card>
    </div>
  );
}
