import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/ui";

export default function Surveillance() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/api/v1/surveillance").then(setData);
  }, []);
  if (!data) return null;
  const t = data.totals;
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-sage">B2B · static preview</p>
      <h1 className="font-display text-4xl">Campus insight</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        SoulCare partners with colleges. This page is a static snapshot of how a wellness office might see uptake, low-mood
        flags, and yellow risk alerts — not live student records.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Students on the app", t.students_on_app],
          ["Low-mood flag", `${t.depressed_pct}%`],
          ["Yellow risk alerts", `${t.yellow_pct}%`],
          ["Red escalations", `${t.red_pct}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs text-sage">{label}</p>
            <p className="font-display text-4xl">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-moss/70">
            <tr>
              <th className="py-2">College</th>
              <th>On app</th>
              <th>Low mood</th>
              <th>Yellow</th>
              <th>App reach</th>
            </tr>
          </thead>
          <tbody>
            {data.colleges.map((c) => (
              <tr key={c.name} className="border-t border-moss/10">
                <td className="py-3 font-semibold">{c.name}</td>
                <td>{c.students}</td>
                <td>{c.depressed_pct}%</td>
                <td>{c.yellow_pct}%</td>
                <td>{c.app_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink/45">{data.partner_note}</p>
    </div>
  );
}
