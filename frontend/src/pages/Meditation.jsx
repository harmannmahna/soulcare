import { useEffect, useState } from "react";
import { Button, Card } from "../components/ui";

const PHASES = [
  { name: "Inhale", seconds: 4, scale: 1.35 },
  { name: "Hold", seconds: 4, scale: 1.35 },
  { name: "Exhale", seconds: 4, scale: 0.85 },
  { name: "Hold", seconds: 4, scale: 0.85 },
];

export default function Meditation() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setLeft((n) => {
        if (n > 1) return n - 1;
        setPhase((p) => {
          const next = (p + 1) % PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          return next;
        });
        return PHASES[(phase + 1) % PHASES.length].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  const current = PHASES[phase];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl">Breathing</h1>
      <p className="mt-2 text-sm text-ink/60">Box breath: four in, four hold, four out, four hold. Follow the circle.</p>
      <Card className="mt-6 flex flex-col items-center py-10">
        <div
          className="flex h-48 w-48 items-center justify-center rounded-full bg-mist text-moss shadow-inner transition-transform duration-1000"
          style={{ transform: `scale(${running ? current.scale : 1})` }}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em]">{current.name}</p>
            <p className="font-display text-5xl">{left}</p>
          </div>
        </div>
        <p className="mt-6 text-sm text-ink/55">{cycles} full rounds</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setRunning((v) => !v)}>{running ? "Pause" : "Begin"}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRunning(false);
              setPhase(0);
              setLeft(PHASES[0].seconds);
              setCycles(0);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}
