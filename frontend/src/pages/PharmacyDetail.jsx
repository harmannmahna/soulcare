import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import { Card } from "../components/ui";

export default function PharmacyDetail() {
  const { id } = useParams();
  const { loadPharmacy } = useCatalog();
  const [row, setRow] = useState(null);
  useEffect(() => {
    loadPharmacy(id).then(setRow);
  }, [id, loadPharmacy]);
  if (!row) return null;
  return (
    <Card>
      <h1 className="font-display text-3xl">{row.name}</h1>
      <p className="text-sm text-ink/60">
        {row.area}, {row.city} · {row.open} · {row.phone}
      </p>
      <div className="mt-4 space-y-2">
        {row.catalog?.map((m) => (
          <Link key={m.id} to={`/medicines/${m.id}`} className="block rounded-2xl bg-sand px-4 py-3 text-sm">
            {m.name} · ₹{m.price_inr}
          </Link>
        ))}
      </div>
    </Card>
  );
}
