import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Input } from "../components/ui";
import { useAdmin } from "../hooks/useAdmin";
import { setAdminToken, getAdminToken } from "../api/client";

export default function Admin() {
  const { sessions, events, alerts, load } = useAdmin();
  const [token, setTok] = useState(getAdminToken());

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Safety ops</h1>
      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Input label="X-Admin-Token" value={token} onChange={(e) => setTok(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            setAdminToken(token);
            load();
          }}
        >
          Connect
        </Button>
      </Card>
      {alerts[0] && (
        <Card className="border border-rose/30 bg-rose-50">
          <p className="font-semibold text-rose">Live red alert</p>
          <p className="text-sm">
            Session {alerts[0].session_id} · {alerts[0].triggered_rule} · {alerts[0].created_at}
          </p>
        </Card>
      )}
      <Card>
        <h2 className="font-display text-2xl">Sessions</h2>
        <div className="mt-3 space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} to={`/admin/sessions/${s.id}`} className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3 text-sm">
              <span>{s.id}</span>
              <Badge tone={s.last_tier}>{s.last_tier}</Badge>
            </Link>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Recent risk events</h2>
        <div className="mt-3 space-y-2 text-sm">
          {events.slice(0, 12).map((e) => (
            <p key={e.id}>
              <Badge tone={e.tier}>{e.tier}</Badge> {e.action} · {e.triggered_rule || "none"}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
