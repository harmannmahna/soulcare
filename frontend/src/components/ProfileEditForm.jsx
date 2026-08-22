import { useState } from "react";
import { Button, Input } from "./ui";
import { useAuth } from "../hooks/useAuth";

export default function ProfileEditForm({ compact = false, onSaved, onCancel }) {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    gender: user?.gender || "",
    age: user?.age || "",
    weight: user?.weight || "",
    height: user?.height || "",
    name: user?.name || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(e) {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await updateProfile({
        name: form.name || undefined,
        gender: form.gender || undefined,
        age: form.age ? Number(form.age) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
      });
      onSaved?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={compact ? "space-y-2" : "space-y-4"} onSubmit={save}>
      {!compact && (
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      )}
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-moss/70">Gender</span>
        <select
          className="w-full rounded-2xl border border-moss/10 bg-white/80 px-3 py-2 text-sm"
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
      <Input label="Age" type="number" min="13" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
      <Input label="Weight (kg)" type="number" min="20" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
      <Input label="Height (cm)" type="number" min="80" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
      {err && <p className="text-xs text-rose">{err}</p>}
      <div className="flex gap-2">
        <Button className={compact ? "px-3 py-1.5 text-xs" : ""} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className={compact ? "px-3 py-1.5 text-xs" : ""} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
