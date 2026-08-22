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

const MOODS = ["low", "ok", "good"];
const FLOW = ["light", "medium", "heavy"];

export default function PeriodTracker() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [cycle, setCycle] = useState(28);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState(null);
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
  const symptoms = data?.symptoms || {};
  const cells = useMemo(() => daysInMonth(cursor.y, cursor.m), [cursor]);

  async function persist(nextDays, nextSymptoms) {
    const sorted = [...nextDays].sort();
    const body = {
      days: sorted,
      cycle_length: Number(cycle) || 28,
      period_length: Math.min(8, sorted.length || 5),
      symptoms: nextSymptoms || symptoms,
    };
    const row = await api("/api/v1/period", { method: "POST", body });
    setData(row);
  }

  function paint(day) {
    if (!day) return;
    const next = new Set(marked);
    if (mode.current === "add") next.add(day);
    else next.delete(day);
    persist(next);
    setPicked(day);
  }

  function tag(day, field, value) {
    const next = { ...symptoms, [day]: { ...(symptoms[day] || {}), [field]: value } };
    persist(marked, next);
  }

  if (user && String(user.gender || "").toLowerCase() !== "female") {
    return <Navigate to="/dashboard" replace />;
  }

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const dayTags = picked ? symptoms[picked] || {} : {};

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">Period tracker</h1>
      <p className="mt-2 text-sm text-ink/60">
        Tap days to mark bleeding. Optional tags for flow, cramps, and mood. Next cycle uses the average of your last 2–3
        logged cycles.
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
                !day
                  ? "invisible"
                  : picked === day
                    ? "ring-2 ring-moss bg-rose text-white"
                    : marked.has(day)
                      ? "bg-rose text-white"
                      : data?.next_start === day
                        ? "bg-mist text-moss ring-1 ring-sage/40"
                        : "bg-sand hover:bg-mist"
              }`}
            >
              {day ? Number(day.slice(-2)) : ""}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-[8rem]">
          <Input label="Typical cycle (days)" type="number" min="22" max="40" value={cycle} onChange={(e) => setCycle(e.target.value)} />
        </div>
        <Button className="mt-3" variant="outline" onClick={() => persist(marked)}>
          Save
        </Button>
        {data?.next_start && (
          <p className="mt-3 text-sm text-sage">
            Predicted next start around {data.next_start} (avg {data.predicted_length || cycle} days
            {data.cycles_seen ? ` · ${data.cycles_seen} cycles logged` : ""}).
          </p>
        )}
      </Card>
      {picked && marked.has(picked) && (
        <Card className="mt-4">
          <p className="text-xs uppercase tracking-wider text-sage">Tags for {picked}</p>
          <p className="mt-2 text-sm">Flow</p>
          <div className="mt-1 flex gap-2">
            {FLOW.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => tag(picked, "flow", f)}
                className={`rounded-full px-3 py-1 text-xs ${dayTags.flow === f ? "bg-moss text-foam" : "bg-sand"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm">Cramps</p>
          <button
            type="button"
            onClick={() => tag(picked, "cramps", !dayTags.cramps)}
            className={`mt-1 rounded-full px-3 py-1 text-xs ${dayTags.cramps ? "bg-moss text-foam" : "bg-sand"}`}
          >
            {dayTags.cramps ? "Cramps noted" : "No cramps tag"}
          </button>
          <p className="mt-3 text-sm">Mood</p>
          <div className="mt-1 flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => tag(picked, "mood", m)}
                className={`rounded-full px-3 py-1 text-xs ${dayTags.mood === m ? "bg-moss text-foam" : "bg-sand"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
