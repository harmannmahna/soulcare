import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card, Input } from "../components/ui";

export default function Exercises() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api(`/api/v1/exercises${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setRows);
  }, [q]);

  return (
    <div>
      <h1 className="font-display text-4xl">Exercises</h1>
      <p className="mt-1 text-sm text-ink/60">Short sessions with a video and why the movement matters.</p>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Search core, walk, yoga…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map((ex) => (
          <Link key={ex.id} to={`/wellness/exercises/${ex.id}`}>
            <Card className="h-full">
              <div className="flex items-start justify-between">
                <p className="font-display text-2xl">{ex.name}</p>
                <Badge>{ex.minutes} min</Badge>
              </div>
              <p className="mt-1 text-sm text-ink/60">{ex.body_part} · {ex.level}</p>
              <p className="mt-3 text-sm">{ex.why}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
