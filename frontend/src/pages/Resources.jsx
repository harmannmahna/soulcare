import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card } from "../components/ui";

export default function Resources() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/api/v1/resources").then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Resource library</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Link key={r.id} to={`/resources/${r.id}`}>
            <Card>
              <Badge>{r.kind}</Badge>
              <p className="mt-2 font-display text-2xl">{r.title}</p>
              <p className="text-sm text-ink/65">{r.summary}</p>
              <p className="mt-2 text-xs text-moss">{r.minutes} min</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
