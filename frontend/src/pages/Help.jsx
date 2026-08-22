import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, Card } from "../components/ui";

export default function Help() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/api/v1/help").then(setRows);
  }, []);
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-4xl">Help nearby</h1>
      <p className="mt-2 text-sm text-ink/65">Human lines first. SoulCare is not a replacement for emergency care.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-ink/55">
                {r.region} · {r.kind}
              </p>
            </div>
            <a href={`tel:${r.phone}`}>
              <Button>{r.phone}</Button>
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
