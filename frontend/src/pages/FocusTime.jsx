import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Button, Card } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

const PRESETS = [
  { id: "focus", label: "Focus 25", minutes: 25, kind: "focus" },
  { id: "short", label: "Break 5", minutes: 5, kind: "break" },
  { id: "long", label: "Break 15", minutes: 15, kind: "break" },
  { id: "trial", label: "Trial 0:20", minutes: 0.33, kind: "focus", seconds: 20 },
];

export default function FocusTime() {
  const { refresh } = useAuth();
  const [state, setState] = useState(null);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const tick = useRef(null);

  async function load() {
    setState(await api("/api/v1/focus"));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    tick.current = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          setRunning(false);
          finish(preset);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running, preset]);

  async function finish(p) {
    const minutes = p.seconds ? 1 : p.minutes;
    const data = await api("/api/v1/focus/complete", { method: "POST", body: { minutes, kind: p.kind } });
    setMsg(`+${data.gained} points. Room wallet: ${data.points}`);
    await load();
    await refresh();
  }

  function choose(p) {
    setPreset(p);
    setRunning(false);
    setLeft(p.seconds || p.minutes * 60);
    setMsg("");
  }

  async function buy(item) {
    setMsg("");
    try {
      await api("/api/v1/focus/room/buy", { method: "POST", body: { item_id: item.id } });
      await load();
      await refresh();
    } catch (ex) {
      setMsg(ex.message);
    }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const owned = new Set(state?.room_items || []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl">Focus time</h1>
        <p className="mt-1 text-sm text-ink/60">A Pomodoro. Finished sessions become points for a quieter room.</p>
        <Card className="mt-5 text-center">
          <p className="font-display text-7xl tabular-nums">
            {mm}:{ss}
          </p>
          <p className="mt-2 text-sm text-sage">{preset.label}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${preset.id === p.id ? "bg-moss text-foam" : "bg-mist text-moss"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => setRunning((v) => !v)}>{running ? "Pause" : "Start"}</Button>
            <Button variant="ghost" onClick={() => choose(preset)}>
              Reset
            </Button>
          </div>
          {msg && <p className="mt-3 text-sm text-sage">{msg}</p>}
          <p className="mt-4 text-sm">
            Wallet · <strong>{state?.points ?? 0}</strong> points
          </p>
          <p className="mt-4 text-xs text-ink/50">
            Phone pickups are watched in the background. Open{" "}
            <a className="text-sage underline" href="/phone-habit">
              Phone habit
            </a>{" "}
            for today’s count.
          </p>
        </Card>
      </div>
      <div>
        <h2 className="font-display text-2xl">Your room</h2>
        <Card className="relative mt-4 h-72 overflow-hidden bg-gradient-to-b from-mist to-sand">
          <div className="absolute inset-x-8 top-8 h-24 rounded-t-3xl bg-foam/70 ring-1 ring-moss/10" />
          {(state?.catalog || [])
            .filter((i) => i.owned)
            .map((item) => (
              <span
                key={item.id}
                className="absolute text-3xl"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                title={item.name}
              >
                {item.emoji}
              </span>
            ))}
          {!owned.size && <p className="relative z-10 p-6 text-sm text-ink/50">Earn points, then place a plant, a lamp, a cat…</p>}
        </Card>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(state?.catalog || []).map((item) => (
            <Card key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p>
                  {item.emoji} {item.name}
                </p>
                <p className="text-xs text-ink/50">{item.cost} pts</p>
              </div>
              {item.owned ? (
                <span className="text-xs text-sage">Placed</span>
              ) : (
                <Button variant="outline" onClick={() => buy(item)}>
                  Buy
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
