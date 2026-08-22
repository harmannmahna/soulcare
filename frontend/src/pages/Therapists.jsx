import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Input, Skeleton } from "../components/ui";
import { useTherapists } from "../hooks/useTherapists";

const SPECIALTIES = [
  "all",
  "anxiety",
  "depression",
  "trauma",
  "student",
  "relationship",
  "physical",
  "nutrition",
  "physio",
  "lgbtq",
  "addiction",
];

export default function Therapists() {
  const { list, load } = useTherapists();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  useEffect(() => {
    const params = {};
    if (q) params.q = q;
    if (tag !== "all") params.tag = tag;
    load(params);
  }, [q, tag, load]);

  return (
    <div>
      <h1 className="font-display text-4xl">Find a therapist</h1>
      <p className="mt-1 text-sm text-ink/60">
        Mental health and physical care in one directory. Search, filter by specialty, then book a session.
      </p>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Search anxiety, physio, grief…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTag(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${tag === s ? "bg-moss text-foam" : "bg-mist text-moss"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        {list.map((t) => (
          <Link key={t.id} to={`/therapists/${t.id}`}>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-2xl">{t.name}</p>
                  <p className="text-sm text-ink/60">
                    {t.title} · {t.city}
                  </p>
                </div>
                <p className="text-sm font-semibold text-sage">₹{t.price_inr}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.tags?.map((tg) => (
                  <Badge key={tg}>{tg}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink/50">
                {t.rating} ★ · {t.reviews} reviews · Book a session →
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
