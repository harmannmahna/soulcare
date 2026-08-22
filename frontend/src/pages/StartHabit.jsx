import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Button, Card, Input, Modal } from "../components/ui";

function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= last; d += 1) {
    const date = new Date(year, month, d);
    cells.push(date.toISOString().slice(0, 10));
  }
  return cells;
}

export default function StartHabit() {
  const [habits, setHabits] = useState([]);
  const [score, setScore] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "start", color: "#4A7C6A" });
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const cells = useMemo(() => monthDays(cursor.y, cursor.m), [cursor]);

  async function load() {
    setHabits(await api("/api/v1/habits"));
    setScore(await api("/api/v1/habits/score"));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(habit, day) {
    const done = !habit.log?.some((x) => x.date === day && x.done);
    await api(`/api/v1/habits/${habit.id}/complete`, { method: "POST", body: { date: day, done } });
    load();
  }

  async function create(e) {
    e.preventDefault();
    await api("/api/v1/habits", { method: "POST", body: form });
    setForm({ name: "", kind: "start", color: "#4A7C6A" });
    setOpen(false);
    load();
  }

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Habits</h1>
          <p className="mt-1 text-sm text-ink/60">Daily streaks and a month view for each practice you want to keep.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New</Button>
      </div>
      <div className="mt-4 flex gap-3">
        <Card className="flex-1">
          <p className="text-xs text-sage">Habit score</p>
          <p className="font-display text-4xl">{score?.score ?? "—"}%</p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-sage">Active</p>
          <p className="font-display text-4xl">{score?.active ?? 0}</p>
        </Card>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => setCursor({ y: cursor.m === 0 ? cursor.y - 1 : cursor.y, m: (cursor.m + 11) % 12 })}>
          ←
        </button>
        <p className="font-display text-xl">{monthLabel}</p>
        <button type="button" onClick={() => setCursor({ y: cursor.m === 11 ? cursor.y + 1 : cursor.y, m: (cursor.m + 1) % 12 })}>
          →
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {habits.map((h) => {
          const doneDays = new Set((h.log || []).filter((x) => x.done).map((x) => x.date));
          const monthDone = cells.filter((d) => d && doneDays.has(d)).length;
          return (
            <Card key={h.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-2xl" style={{ color: h.color }}>
                    {h.name}
                  </p>
                  <p className="text-xs text-ink/50">
                    {h.streak}-day streak · {monthDone} days this month · {h.kind}
                  </p>
                </div>
                <Button variant="outline" onClick={() => toggle(h, new Date().toISOString().slice(0, 10))}>
                  {h.due ? "Check today" : "Undo today"}
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-ink/40">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
                {cells.map((day, i) =>
                  day ? (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggle(h, day)}
                      className={`h-7 rounded-md ${doneDays.has(day) ? "bg-moss text-foam" : "bg-sand hover:bg-mist"}`}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  ) : (
                    <span key={`e-${i}`} />
                  ),
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={open} title="Create a habit" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={create}>
          <Input label="Name" placeholder="Studying, walk, no smoking…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">Kind</span>
            <select className="mt-1 w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="start">Start (a good habit)</option>
              <option value="quit">Quit (a hard habit)</option>
            </select>
          </label>
          <Button className="w-full">Save habit</Button>
        </form>
      </Modal>
    </div>
  );
}
