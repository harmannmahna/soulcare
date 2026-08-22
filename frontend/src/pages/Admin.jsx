import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Input } from "../components/ui";
import { useAdmin } from "../hooks/useAdmin";
import { setAdminToken, getAdminToken } from "../api/client";

function conf(e) {
  if (e?.model_confidence == null) return null;
  return `${Math.round(Number(e.model_confidence) * 100)}%`;
}

export default function Admin() {
  const { sessions, events, alerts, agentActions, load } = useAdmin();
  const [token, setTok] = useState(getAdminToken());

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Admin · live ops</p>
        <h1 className="font-display text-4xl">Safety ops</h1>
        <p className="mt-1 text-sm text-ink/55">
          Individual sessions and risk events. Model confidence is admin-only. User dashboards never see these scores.
        </p>
      </div>
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
        <Card className="border border-rose/30 bg-rose/10">
          <p className="font-semibold text-rose">Live red alert</p>
          <p className="text-sm">
            Session {alerts[0].session_id} · {alerts[0].triggered_rule} · {alerts[0].created_at}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alerts[0].notifiedChannel && (
              <Badge tone="green">NGO Notified ✓ · {alerts[0].notifiedChannel}</Badge>
            )}
            {alerts[0].notifiedAt && <Badge>{alerts[0].notifiedAt}</Badge>}
            {conf(alerts[0]) && <Badge>model {conf(alerts[0])}</Badge>}
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-display text-2xl">Sessions</h2>
        <div className="mt-3 space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} to={`/admin/sessions/${s.id}`} className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3 text-sm">
              <span className="truncate">
                {s.id}
                <span className="ml-2 text-xs text-ink/45">{s.summary || ""}</span>
              </span>
              <Badge tone={s.last_tier}>{s.last_tier}</Badge>
            </Link>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Companion agent actions</h2>
        <p className="mt-1 text-xs text-ink/50">Tools the companion ran on a user&apos;s behalf. Inspectable on purpose.</p>
        <div className="mt-3 space-y-2 text-sm">
          {(agentActions || []).slice(0, 12).map((a) => (
            <div key={a.id} className="rounded-2xl bg-sand px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.ok ? "green" : "red"}>{a.tool}</Badge>
                <span className="text-xs text-ink/50">{a.created_at}</span>
              </div>
              <p className="mt-1 text-xs text-ink/70">user {a.user_id} · session {a.session_id || "—"}</p>
            </div>
          ))}
          {(!agentActions || agentActions.length === 0) && (
            <p className="text-sm text-ink/50">No agentic actions yet.</p>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Recent risk events</h2>
        <div className="mt-3 space-y-2 text-sm">
          {events.slice(0, 12).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-sand px-3 py-2">
              <Badge tone={e.tier}>{e.tier}</Badge>
              <span>
                {e.action} · {e.triggered_rule || "none"}
              </span>
              {conf(e) && <Badge>model {conf(e)} ({e.model_label || "—"})</Badge>}
              {e.notifiedChannel && <Badge tone="green">NGO Notified ✓ · {e.notifiedChannel}</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
