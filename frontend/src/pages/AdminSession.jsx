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
      <h1 className="font-display text-3xl">Session {row.id}</h1>
      <p className="mt-2 text-sm text-ink/60">
        User {row.user_id} · {row.channel} · turns {row.turn_count}
      </p>
      <div className="mt-4 space-y-2">
        {row.events?.map((e) => (
          <p key={e.id} className="text-sm">
            <Badge tone={e.tier}>{e.tier}</Badge> {e.action} · {e.triggered_rule || "—"} · {e.created_at}
          </p>
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
