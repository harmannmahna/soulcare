import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, Button, Card, Input, Textarea } from "../components/ui";

export default function Partner() {
  const [info, setInfo] = useState(null);
  const [desk, setDesk] = useState(null);
  const [role, setRole] = useState("therapist");
  const [form, setForm] = useState({ name: "", email: "", city: "", specialty: "", notes: "" });
  const [slot, setSlot] = useState({ label: "Tomorrow · 18:00 IST", starts_at: "" });
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const [i, me] = await Promise.all([api("/api/v1/partners/info"), api("/api/v1/partners/me")]);
    setInfo(i);
    setDesk(me);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/v1/partners", { method: "POST", body: { role, ...form } });
      await load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function agree() {
    await api("/api/v1/partners/agree", { method: "POST", body: { agreed: true } });
    setNote("Agreement signed. You can post slots and will see bookings here.");
    await load();
  }

  async function addSlot(e) {
    e.preventDefault();
    await api("/api/v1/partners/slots", { method: "POST", body: slot });
    setNote("Slot published.");
    await load();
  }

  const partner = desk?.partner;
  const fee = partner?.role === "chemist" ? info?.chemist_fee_pct : info?.therapist_fee_pct;

  if (partner) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Partner desk</p>
        <h1 className="font-display text-4xl">{partner.role === "chemist" ? "Chemist" : "Therapist"} dashboard</h1>
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl">{partner.name}</p>
              <p className="text-sm text-ink/60">
                {partner.city} · {partner.specialty || "—"} · {partner.email}
              </p>
            </div>
            <Badge tone={partner.status === "active" ? "green" : "yellow"}>{partner.status}</Badge>
          </div>
          <p className="mt-3 text-sm">
            Platform fee <strong>{partner.platform_fee_pct || fee}%</strong>
            {partner.role === "therapist" ? " of session fees" : " of catalog orders"}.
          </p>
          {!partner.agreement && (
            <Button className="mt-4" onClick={agree}>
              Sign agreement ({partner.platform_fee_pct}%)
            </Button>
          )}
          {partner.agreement && <p className="mt-2 text-xs text-sage">Agreement on file · {partner.agreement_at}</p>}
          {note && <p className="mt-2 text-sm text-moss">{note}</p>}
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Appointment slots</h2>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={addSlot}>
            <div className="flex-1 min-w-[12rem]">
              <Input label="Label" value={slot.label} onChange={(e) => setSlot({ ...slot, label: e.target.value })} />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <Input
                label="Starts at (ISO, optional)"
                value={slot.starts_at}
                onChange={(e) => setSlot({ ...slot, starts_at: e.target.value })}
              />
            </div>
            <Button className="self-end">Add slot</Button>
          </form>
          <ul className="mt-3 space-y-2 text-sm">
            {(desk.slots || []).map((s) => (
              <li key={s.id} className="rounded-2xl bg-sand px-3 py-2">
                {s.label} {s.taken ? "· taken" : "· open"}
              </li>
            ))}
            {(desk.slots || []).length === 0 && <p className="text-ink/50">No slots yet.</p>}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Bookings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(desk.bookings || []).map((b) => (
              <li key={b.id} className="rounded-2xl bg-sand px-3 py-2">
                {b.client_name || "Member"} · {b.label || b.starts_at} · {b.status}
              </li>
            ))}
            {(desk.bookings || []).length === 0 && <p className="text-ink/50">No customers booked you yet.</p>}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Notifications</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(desk.notifications || []).map((n) => (
              <li key={n.id} className="rounded-2xl bg-sand px-3 py-2">
                {n.body}
                <span className="ml-2 text-xs text-ink/45">{n.created_at}</span>
              </li>
            ))}
            {(desk.notifications || []).length === 0 && <p className="text-ink/50">Quiet for now.</p>}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl">Join as a partner</h1>
      <p className="mt-2 text-sm text-ink/60">
        Therapists and chemists can list on SoulCare. Sign the fee agreement, publish slots, and receive booking
        notifications here.
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
          <Button className="w-full">Create profile</Button>
        </form>
      </Card>
    </div>
  );
}
