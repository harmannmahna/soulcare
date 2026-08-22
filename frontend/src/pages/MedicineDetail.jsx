import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCatalog } from "../hooks/useCatalog";
import { Card } from "../components/ui";

export default function MedicineDetail() {
  const { id } = useParams();
  const { loadMedicine } = useCatalog();
  const [row, setRow] = useState(null);
  useEffect(() => {
    loadMedicine(id).then(setRow);
  }, [id, loadMedicine]);
  if (!row) return null;
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl">{row.name}</h1>
      <p className="mt-3">{row.use}</p>
      <p className="mt-2 text-sm text-ink/60">
        {row.form} · ₹{row.price_inr}
      </p>
    </Card>
  );
}
