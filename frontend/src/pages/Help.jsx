import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Button, Card, Input } from "../components/ui";

const CATS = [
  { id: "all", label: "All" },
  { id: "government", label: "Government" },
  { id: "ngo", label: "NGOs" },
  { id: "wellness", label: "Wellness centres" },
  { id: "crisis", label: "Crisis lines" },
];

export default function Help() {
  const [rows, setRows] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api("/api/v1/help").then(setRows);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const hay = `${r.name} ${r.region} ${r.kind} ${r.category} ${r.city}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (cat === "all") return true;
      if (cat === "crisis") return r.kind === "crisis" || r.kind === "suicide_prevention";
      return r.category === cat;
    });
  }, [rows, cat, q]);

  return (
    <div>
      <h1 className="font-display text-4xl">Find help nearby</h1>
      <p className="mt-2 text-sm text-ink/65">
        Government foundations, NGOs, and wellness centres. Human lines first — SoulCare is not emergency care.
      </p>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Search city, NGO, helpline…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${cat === c.id ? "bg-moss text-foam" : "bg-mist text-moss"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {filtered.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-ink/55">
                {r.city || r.region} · {r.kind?.replace("_", " ")}
              </p>
              <div className="mt-1">
                <Badge>{r.category || "support"}</Badge>
              </div>
            </div>
            <a href={`tel:${r.phone}`}>
              <Button>{r.phone}</Button>
            </a>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-ink/45">
        Want to list a clinic?{" "}
        <Link className="text-sage" to="/partner">
          Join as a partner
        </Link>
        .
      </p>
    </div>
  );
}
