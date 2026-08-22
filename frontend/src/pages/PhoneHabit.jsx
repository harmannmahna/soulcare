import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/ui";

export default function PhoneHabit() {
  const [today, setToday] = useState({ count: 0 });

  useEffect(() => {
    api("/api/v1/phone/today").then(setToday);
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl">Phone habit</h1>
      <p className="mt-2 text-sm text-ink/60">
        When you leave SoulCare and come back — or the tab becomes visible again — we treat it as a pickup and send a
        gentle pop-up. This is a web stand-in for a lock-screen detector.
      </p>
      <Card className="mt-5">
        <p className="text-xs uppercase tracking-wider text-sage">Pickups today</p>
        <p className="font-display text-6xl">{today.count}</p>
        <p className="mt-3 text-sm text-ink/60">
          Try switching apps or hiding this tab, then return. A moss toast will appear on the dashboard layout.
        </p>
      </Card>
    </div>
  );
}
