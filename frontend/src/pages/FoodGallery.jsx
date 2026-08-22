import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, Card, Input } from "../components/ui";

export default function FoodGallery() {
  const [foods, setFoods] = useState([]);
  const [log, setLog] = useState([]);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "" });
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setFoods(await api(`/api/v1/food${q ? `?q=${encodeURIComponent(q)}` : ""}`));
    setLog(await api("/api/v1/food/log"));
  }

  useEffect(() => {
    load();
  }, [q]);

  async function add(payload) {
    await api("/api/v1/food/log", { method: "POST", body: payload });
    setCustom({ name: "", kcal: "" });
    load();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const guess = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      const data = await api("/api/v1/food/scan", { method: "POST", body: { filename: file.name, hint: guess } });
      setScan({ ...data, preview: URL.createObjectURL(file) });
    } finally {
      setBusy(false);
    }
  }

  const todayKcal = log
    .filter((r) => (r.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((s, r) => s + (r.kcal || 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="font-display text-4xl">Food gallery</h1>
        <p className="mt-1 text-sm text-ink/60">Type a meal or photograph a plate. Calories are a gentle estimate, not a lab report.</p>
        <p className="mt-2 text-sm text-sage">Today · {todayKcal} kcal logged</p>
        <div className="mt-4">
          <Input placeholder="Search idli, banana, biryani…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {foods.map((f) => (
            <Card key={f.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{f.name}</p>
                <p className="text-xs text-ink/50">{f.kcal} kcal</p>
              </div>
              <Button variant="outline" onClick={() => add({ food_id: f.id })}>
                Add
              </Button>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <p className="font-display text-xl">Your own item</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <Input label="Calories" type="number" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} />
          </div>
          <Button className="mt-3" onClick={() => add({ name: custom.name, kcal: Number(custom.kcal) })}>
            Log food
          </Button>
        </Card>
        <Card className="mt-4">
          <p className="font-display text-xl">Scan a photo</p>
          <input className="mt-3 text-sm" type="file" accept="image/*" capture="environment" onChange={onFile} />
          {busy && <p className="mt-2 text-sm text-moss">Reading the plate…</p>}
          {scan && (
            <div className="mt-3 flex gap-3">
              {scan.preview && <img src={scan.preview} alt="" className="h-20 w-20 rounded-2xl object-cover" />}
              <div>
                <p className="font-semibold">{scan.name}</p>
                <p className="text-sm text-ink/60">~{scan.kcal} kcal · {scan.note}</p>
                <Button className="mt-2" onClick={() => add({ name: scan.name, kcal: scan.kcal, food_id: scan.food_id })}>
                  Add this estimate
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      <div>
        <h2 className="font-display text-2xl">Recent logs</h2>
        <div className="mt-3 space-y-2">
          {log.map((r) => (
            <Card key={r.id}>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-ink/50">
                {r.kcal} kcal · {(r.created_at || "").replace("T", " ").slice(0, 16)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
