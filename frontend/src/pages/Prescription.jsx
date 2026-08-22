import { useState } from "react";
import { useCatalog } from "../hooks/useCatalog";
import { Button, Card, Input, Textarea } from "../components/ui";

export default function Prescription() {
  const { uploadRx } = useCatalog();
  const [form, setForm] = useState({ title: "GP follow-up", doctor: "Dr. Shah", notes: "", demo_file_name: "rx-demo.jpg" });
  const [saved, setSaved] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaved(await uploadRx(form));
  }

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl">Prescription upload</h1>
      <p className="mt-2 text-sm text-rose/80">Demo scope only — metadata, not a medical record store.</p>
      <form className="mt-5 space-y-3" onSubmit={submit}>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Doctor" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button>Save demo metadata</Button>
      </form>
      {saved && <p className="mt-4 text-sm">Lookup ID: {saved.id}</p>}
    </Card>
  );
}
