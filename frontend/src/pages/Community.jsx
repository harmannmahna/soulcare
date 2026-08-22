import { useEffect, useState } from "react";
import { api, getToken } from "../api/client";
import { Button, Card, Textarea } from "../components/ui";

export default function Community() {
  const [rows, setRows] = useState([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setRows(await api("/api/v1/community"));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Community</h1>
      <p className="text-sm text-ink/60">Anonymous, supportive-only. No DMs. Harsh language is blocked.</p>
      {getToken() && (
        <Card>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              try {
                await api("/api/v1/community", { method: "POST", body: { body, alias: "soft-leaf" } });
                setBody("");
                load();
              } catch (ex) {
                setErr(ex.message);
              }
            }}
          >
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a small win or a kind ask…" />
            {err && <p className="mt-2 text-sm text-rose">{err}</p>}
            <Button className="mt-3">Post</Button>
          </form>
        </Card>
      )}
      {rows.map((p) => (
        <Card key={p.id}>
          <p className="text-xs text-sage">{p.alias}</p>
          <p className="mt-1 text-sm">{p.body}</p>
        </Card>
      ))}
    </div>
  );
}
