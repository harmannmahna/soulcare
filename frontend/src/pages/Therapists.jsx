import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Input, Skeleton } from "../components/ui";
import { useTherapists } from "../hooks/useTherapists";

export default function Therapists() {
  const { list, load } = useTherapists();
  const [q, setQ] = useState("");

  useEffect(() => {
    load(q ? { q } : {});
  }, [q, load]);

  return (
    <div>
      <h1 className="font-display text-4xl">Therapists</h1>
      <p className="mt-1 text-sm text-ink/60">The same directory yellow-tier chat uses for specialty matching.</p>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Search anxiety, grief, JEE…" value={q} onChange={(e) => setQ(e.target.value)} />
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
                {t.tags?.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink/50">
                {t.rating} ★ · {t.reviews} reviews
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
