import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import { Card } from "../components/ui";

export default function Pharmacy() {
  const { loadPharmacies } = useCatalog();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    loadPharmacies().then(setRows);
  }, [loadPharmacies]);
  return (
    <div>
      <h1 className="font-display text-4xl">Nearby pharmacies</h1>
      <p className="text-sm text-ink/55">Static demo catalog for the hackathon — not live geolocation.</p>
      <div className="mt-5 grid gap-3">
        {rows.map((p) => (
          <Link key={p.id} to={`/pharmacy/${p.id}`}>
            <Card>
              <p className="font-display text-2xl">{p.name}</p>
              <p className="text-sm text-ink/60">
                {p.area}, {p.city} · {p.open}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
