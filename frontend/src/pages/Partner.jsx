import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, Card, Input, Textarea } from "../components/ui";

export default function Partner() {
  const [info, setInfo] = useState(null);
  const [role, setRole] = useState("therapist");
  const [form, setForm] = useState({ name: "", email: "", city: "", specialty: "", notes: "" });
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/v1/partners/info").then(setInfo);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const row = await api("/api/v1/partners", { method: "POST", body: { role, ...form } });
      setDone(row);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl">Join as a partner</h1>
      <p className="mt-2 text-sm text-ink/60">
        Therapists and chemists can list on SoulCare. We keep a platform fee so matching, safety triage, and payouts stay
        on.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Card className={role === "therapist" ? "ring-2 ring-moss/30" : ""}>
          <button type="button" className="w-full text-left" onClick={() => setRole("therapist")}>
            <p className="font-display text-2xl">Therapist</p>
            <p className="mt-1 text-sm text-ink/60">{info?.copy?.therapist}</p>
            <p className="mt-2 text-sm font-semibold text-sage">{info?.therapist_fee_pct}% platform fee</p>
          </button>
        </Card>
        <Card className={role === "chemist" ? "ring-2 ring-moss/30" : ""}>
          <button type="button" className="w-full text-left" onClick={() => setRole("chemist")}>
            <p className="font-display text-2xl">Chemist</p>
            <p className="mt-1 text-sm text-ink/60">{info?.copy?.chemist}</p>
            <p className="mt-2 text-sm font-semibold text-sage">{info?.chemist_fee_pct}% platform fee</p>
          </button>
        </Card>
      </div>
      {done ? (
        <Card className="mt-5">
          <p className="font-display text-2xl">Application in</p>
          <p className="mt-2 text-sm text-ink/60">
            Thanks, {done.name}. Status is {done.status}. Platform fee {done.platform_fee_pct}%. We will write to {done.email}.
          </p>
        </Card>
      ) : (
        <Card className="mt-5">
          <form className="space-y-3" onSubmit={submit}>
            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input
              label={role === "therapist" ? "Specialty" : "Store / chain"}
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            />
            <Textarea label="Notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {err && <p className="text-sm text-rose">{err}</p>}
            <Button className="w-full">Submit application</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
