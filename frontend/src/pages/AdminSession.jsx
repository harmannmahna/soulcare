import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Button, Card } from "../components/ui";
import { useAdmin } from "../hooks/useAdmin";

export default function AdminSession() {
  const { id } = useParams();
  const { session, takeover } = useAdmin();
  const [row, setRow] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    session(id).then(setRow);
  }, [id, session]);

  if (!row) return null;
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.2em] text-sage">Admin</p>
      <h1 className="font-display text-3xl">Session {row.id}</h1>
      <p className="mt-2 text-sm text-ink/60">
        User {row.user_id} · {row.channel} · turns {row.turn_count} · peak {row.peak_tier || row.last_tier}
      </p>
      <div className="mt-4 space-y-2">
        {row.events?.map((e) => (
          <div key={e.id} className="rounded-2xl bg-sand px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={e.tier}>{e.tier}</Badge>
              <span>
                {e.action} · {e.triggered_rule || "—"}
              </span>
              {e.model_confidence != null && (
                <Badge>
                  model {Math.round(Number(e.model_confidence) * 100)}% ({e.model_label || "—"})
                </Badge>
              )}
              {e.notifiedChannel && <Badge tone="green">NGO Notified ✓ · {e.notifiedChannel}</Badge>}
            </div>
            <p className="mt-1 text-xs text-ink/45">
              {e.created_at}
              {e.notifiedAt ? ` · notified ${e.notifiedAt}` : ""}
            </p>
          </div>
        ))}
      </div>
      <Button
        className="mt-5"
        variant="amber"
        onClick={async () => {
          const r = await takeover(id);
          setNote(`Takeover queued (${r.handoff}). Counsellor handoff is mocked for the hackathon.`);
        }}
      >
        Take over session
      </Button>
      {note && <p className="mt-3 text-sm text-ink/70">{note}</p>}
    </Card>
  );
}
