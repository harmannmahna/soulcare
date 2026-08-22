import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
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
  const [ranked, setRanked] = useState([]);
  const [params] = useSearchParams();

  useEffect(() => {
    const query = {};
    if (q) query.q = q;
    if (tag !== "all") query.tag = tag;
    load(query);
  }, [q, tag, load]);

  useEffect(() => {
    const context = params.get("q") || sessionStorage.getItem("sc_last_problem") || q;
    const tags = tag === "all" ? "" : tag;
    if (!context && !tags) {
      setRanked([]);
      return;
    }
    const search = new URLSearchParams();
    if (context) search.set("q", context);
    if (tags) search.set("tags", tags);
    api(`/api/v1/therapists/match?${search}`)
      .then(setRanked)
      .catch(() => setRanked([]));
  }, [q, tag, params]);

  const shown = ranked.length ? ranked : list;

  return (
    <div>
      <h1 className="font-display text-4xl">Find a therapist</h1>
      <p className="mt-1 text-sm text-ink/60">
        Ranked by similarity to what you described (Weaviate when configured, otherwise local embeddings). Tag filter
        remains as a fallback.
      </p>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Describe the problem: anxiety, sleep, JEE…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {shown.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        {shown.map((t) => (
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
              {t.match_reason && <p className="mt-2 text-xs text-moss">{t.match_reason}</p>}
              {t.similarity != null && <p className="text-[11px] text-ink/45">similarity {t.similarity}</p>}
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
