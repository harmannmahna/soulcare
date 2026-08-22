import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { Button, Card } from "../components/ui";

export default function ResourceDetail() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api(`/api/v1/resources/${id}`).then(setRow);
  }, [id]);
  if (!row) return null;
  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">{row.title}</h1>
      <p className="mt-4 leading-relaxed">{row.body}</p>
      {getToken() && (
        <Button
          className="mt-6"
          variant="outline"
          onClick={async () => {
            await api(`/api/v1/resources/${id}/save`, { method: "POST" });
            setSaved(true);
          }}
        >
          {saved ? "Saved to your profile" : "Save to profile"}
        </Button>
      )}
    </Card>
  );
}
