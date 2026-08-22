import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Skeleton } from "../components/ui";
import { useTherapists } from "../hooks/useTherapists";

export default function TherapistDetail() {
  const { id } = useParams();
  const { detail, get } = useTherapists();
  const nav = useNavigate();

  useEffect(() => {
    get(id);
  }, [id, get]);

  if (!detail) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <p className="text-xs uppercase tracking-wider text-sage">{detail.city}</p>
        <h1 className="font-display text-4xl">{detail.name}</h1>
        <p className="text-ink/60">{detail.title}</p>
        <p className="mt-4 text-sm leading-relaxed">{detail.bio}</p>
        <p className="mt-3 text-sm text-moss">{detail.approach}</p>
        <div className="mt-4 flex flex-wrap gap-1">
          {detail.tags?.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <p className="mt-4 text-sm">
          ₹{detail.price_inr} · {detail.years} years · {detail.languages?.join(", ")}
        </p>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Open slots</h2>
        <div className="mt-4 grid gap-2">
          {detail.slots
            ?.filter((s) => !s.taken)
            .slice(0, 8)
            .map((s) => (
              <button
                key={s.id}
                className="rounded-2xl bg-sand px-4 py-3 text-left text-sm hover:bg-mist"
                onClick={() =>
                  nav("/booking", { state: { therapist_id: detail.id, slot_id: s.id, label: s.label, name: detail.name } })
                }
              >
                {s.label}
              </button>
            ))}
        </div>
        <Button className="mt-4" variant="outline" onClick={() => nav("/therapists")}>
          Back to directory
        </Button>
      </Card>
    </div>
  );
}
