import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/ui";

export default function B2BDemo() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/api/v1/b2b/snapshot").then(setData).catch(() => api("/api/v1/surveillance").then(setData));
  }, []);
  if (!data) return null;
  const t = data.totals || {};
  const week = data.this_week || {};
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-sage">B2B · colleges & NGOs</p>
      <h1 className="font-display text-4xl">Institutional report</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Aggregate-only view. No names, session IDs, or chat text. Figures are a realistic sample for the demo week — not
        live student records.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Flagged yellow this week", `${week.flagged_yellow_pct ?? t.yellow_pct}%`],
          ["Flagged red this week", `${week.flagged_red_pct ?? t.red_pct}%`],
          ["Weekly active users", t.weekly_active_users ?? t.students_on_app],
          ["Engagement", `${t.engagement_pct ?? "—"}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs text-sage">{label}</p>
            <p className="font-display text-4xl">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Check-ins", t.weekly_checkins],
          ["Talk-now starts", week.talk_now_starts],
          ["Therapist bookings", t.therapist_bookings],
          ["Habit completions", t.habit_completions],
          ["Resource opens", week.resource_opens],
          ["NGO notifications", t.ngo_notifications],
        ].map(([label, value]) => (
          <Card key={label} className="py-4">
            <p className="text-xs text-sage">{label}</p>
            <p className="font-display text-3xl">{value ?? "—"}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="text-xs uppercase tracking-wider text-sage">{week.label || "This week"}</p>
        <h2 className="font-display text-2xl">Campus breakdown</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-moss/70">
              <tr>
                <th className="py-2">College</th>
                <th>On app</th>
                <th>Low mood</th>
                <th>Yellow</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {(data.colleges || []).map((c) => (
                <tr key={c.name} className="border-t border-moss/10">
                  <td className="py-3 font-semibold">{c.name}</td>
                  <td>{c.students}</td>
                  <td>{c.depressed_pct}%</td>
                  <td>{c.yellow_pct}%</td>
                  <td>{c.engagement_pct ?? c.app_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-4 text-xs text-ink/45">{data.partner_note}</p>
    </div>
  );
}
