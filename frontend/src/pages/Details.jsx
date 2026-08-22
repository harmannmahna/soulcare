import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";

export default function Details() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    gender: user?.gender || "",
    age: user?.age || "",
    weight: user?.weight || "",
    height: user?.height || "",
    consent: true,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/v1/auth/details", {
        method: "POST",
        body: {
          gender: form.gender,
          age: Number(form.age),
          weight: Number(form.weight),
          height: Number(form.height),
          consent: form.consent,
        },
      });
      await refresh();
      nav("/dashboard");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Almost there</p>
        <h1 className="mt-1 font-display text-4xl">A few details</h1>
        <p className="mt-2 text-sm text-ink/60">
          Age, gender, height, and weight help us personalise habits and show the period tracker only when it belongs.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">Gender</span>
            <select
              required
              className="w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Choose</option>
              <option value="female">Woman</option>
              <option value="male">Man</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </label>
          <Input required label="Age" type="number" min="13" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          <Input required label="Weight (kg)" type="number" min="20" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <Input required label="Height (cm)" type="number" min="80" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
          <label className="flex items-start gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            />
            SoulCare is not a doctor. If I am in crisis I will call 112 or Tele-MANAS 14416.
          </label>
          {err && <p className="text-sm text-rose">{err}</p>}
          <Button className="w-full" disabled={busy || !form.consent}>
            {busy ? "Saving…" : "Enter SoulCare"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
