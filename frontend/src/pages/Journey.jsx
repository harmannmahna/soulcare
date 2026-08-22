import { useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "../components/ui";
import { useJourney } from "../hooks/useJourney";
import { useHabits } from "../hooks/useHabits";
import { api } from "../api/client";

function Heatmap({ log = [] }) {
  const cells = log.slice(-28);
  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((c) => (
        <div
          key={c.date}
          title={c.date}
          className={`h-4 rounded-sm ${c.done ? "bg-sage" : "bg-mist"}`}
        />
      ))}
    </div>
  );
}

function Rings({ rings = [] }) {
  return (
    <div className="flex justify-between gap-2">
      {rings.map((r) => (
        <div key={r.date} className="flex flex-1 flex-col items-center gap-1">
          <svg viewBox="0 0 36 36" className="h-12 w-12">
            <path
              d="M18 2.5 a 15.5 15.5 0 1 1 0 31 a 15.5 15.5 0 1 1 0 -31"
              fill="none"
              stroke="#D8E3DC"
              strokeWidth="3.5"
            />
            <path
              d="M18 2.5 a 15.5 15.5 0 1 1 0 31 a 15.5 15.5 0 1 1 0 -31"
              fill="none"
              stroke="#3F6F5E"
              strokeWidth="3.5"
              strokeDasharray={`${(r.pct / 100) * 97} 97`}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] text-ink/55">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Journey() {
  const { board, checkins, weekly, load, addCheckin } = useJourney();
  const { habits, load: loadHabits, create, complete } = useHabits();
  const [tab, setTab] = useState("all");
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [water, setWater] = useState(6);
  const [note, setNote] = useState("");
  const [habitName, setHabitName] = useState("");
  const [foods, setFoods] = useState([]);
  const [period, setPeriod] = useState(null);

  useEffect(() => {
    load();
    loadHabits(tab);
    api("/api/v1/food").then(setFoods);
    api("/api/v1/period").then(setPeriod);
  }, [load, loadHabits, tab]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Journey</h1>
        <p className="text-sm text-ink/60">Mood check-ins and habit streaks on one holistic board.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wider text-sage">Habit score</p>
          <p className="font-display text-5xl">{board?.habit_score ?? 0}%</p>
          <p className="text-xs text-ink/50">Last 7 days across active habits</p>
        </Card>
        <Card className="md:col-span-2">
          <p className="mb-3 text-xs uppercase tracking-wider text-sage">Weekly rings</p>
          <Rings rings={board?.rings || []} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Habits</h2>
          <div className="flex gap-2 text-xs">
            {["all", "due"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 ${tab === t ? "bg-moss text-foam" : "bg-mist"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!habitName.trim()) return;
            await create({ name: habitName, kind: "start" });
            setHabitName("");
          }}
        >
          <div className="flex-1">
            <Input placeholder="Add any habit — Java Full Stack, quit smoking…" value={habitName} onChange={(e) => setHabitName(e.target.value)} />
          </div>
          <Button>Add</Button>
        </form>
        <div className="mt-4 space-y-3">
          {habits.map((h) => (
            <div key={h.id} className="rounded-2xl bg-sand p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-xs text-ink/50">
                    {h.streak} day streak · {h.kind}
                  </p>
                </div>
                <Button variant={h.due ? "primary" : "outline"} onClick={() => complete(h.id, true)}>
                  {h.due ? "Mark today" : "Done"}
                </Button>
              </div>
              <div className="mt-3">
                <Heatmap log={h.log} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Daily check-in</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await addCheckin({ mood, sleep_hours: Number(sleep), hydration: Number(water), note });
              setNote("");
            }}
          >
            <label className="block text-sm">
              Mood {mood}
              <input className="w-full" type="range" min="1" max="5" value={mood} onChange={(e) => setMood(Number(e.target.value))} />
            </label>
            <Input label="Sleep hours" type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} />
            <Input label="Water glasses" type="number" value={water} onChange={(e) => setWater(e.target.value)} />
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button>Save check-in</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">This week</h2>
          <p className="mt-2 text-sm">
            Avg mood {weekly?.avg_mood || 0} · sleep {weekly?.avg_sleep || 0}h · water {weekly?.avg_hydration || 0}
          </p>
          <div className="mt-4 flex h-28 items-end gap-1">
            {(weekly?.points || []).map((p, i) => (
              <div key={i} className="flex-1 rounded-t bg-sage/80" style={{ height: `${(p.mood / 5) * 100}%` }} title={p.date} />
            ))}
          </div>
          <div className="mt-4 max-h-40 space-y-2 overflow-auto text-sm">
            {checkins.slice(0, 6).map((c) => (
              <p key={c.id}>
                <Badge tone="sage">{c.mood}/5</Badge> <span className="text-ink/60">{c.note}</span>
              </p>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Meal log</h2>
          <p className="text-xs text-ink/50">Hackathon lookup table — photo calories are a stretch goal.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {foods.map((f) => (
              <button
                key={f.id}
                className="rounded-full bg-mist px-3 py-1 text-xs"
                onClick={() => api("/api/v1/food/log", { method: "POST", body: { food_id: f.id } })}
              >
                {f.name} · {f.kcal}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Cycle</h2>
          {period?.tracked ? (
            <p className="mt-2 text-sm">
              Day {period.day_in_cycle} · next start {period.next_start}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink/55">No cycle logged yet.</p>
          )}
          <Button
            className="mt-3"
            variant="outline"
            onClick={async () => {
              const today = new Date().toISOString().slice(0, 10);
              setPeriod(await api("/api/v1/period", { method: "POST", body: { last_start: today, cycle_length: 28 } }));
            }}
          >
            Log period start today
          </Button>
        </Card>
      </div>
    </div>
  );
}
