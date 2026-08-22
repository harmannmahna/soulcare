import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import { Card } from "../components/ui";

export default function Medicines() {
  const { loadMedicines } = useCatalog();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    loadMedicines().then(setRows);
  }, [loadMedicines]);
  return (
    <div>
      <h1 className="font-display text-4xl">Medicines</h1>
      <p className="text-sm text-ink/55">Demo catalog only — not medical advice.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((m) => (
          <Link key={m.id} to={`/medicines/${m.id}`}>
            <Card>
              <p className="font-display text-2xl">{m.name}</p>
              <p className="text-sm text-ink/60">{m.use}</p>
              <p className="mt-2 text-sm text-sage">₹{m.price_inr}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
