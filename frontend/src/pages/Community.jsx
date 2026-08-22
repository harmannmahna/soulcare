import { useEffect, useState } from "react";
import { api, getToken } from "../api/client";
import { Badge, Button, Card, Input, Textarea } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

const TOPICS = [
  { id: "all", label: "All" },
  { id: "mental-health", label: "Mental health" },
  { id: "women", label: "Women" },
  { id: "habits", label: "Habits" },
  { id: "physical", label: "Physical" },
  { id: "study", label: "Study" },
  { id: "kindness", label: "Kindness" },
];

export default function Community() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [topic, setTopic] = useState("all");
  const [body, setBody] = useState("");
  const [postTopic, setPostTopic] = useState("mental-health");
  const [alias, setAlias] = useState("soft-leaf");
  const [friends, setFriends] = useState([]);
  const [invite, setInvite] = useState("");
  const [err, setErr] = useState("");

  async function load(nextTopic = topic) {
    const q = nextTopic && nextTopic !== "all" ? `?topic=${nextTopic}` : "";
    setRows(await api(`/api/v1/community${q}`));
    if (getToken()) {
      const data = await api("/api/v1/community/friends");
      setFriends(data.friends || []);
    }
  }

  useEffect(() => {
    load(topic);
  }, [topic]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Community</h1>
        <p className="text-sm text-ink/60">Supportive threads only. Sort by what the conversation is about.</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${topic === t.id ? "bg-moss text-foam" : "bg-mist text-moss"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {getToken() && (
          <Card>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErr("");
                try {
                  await api("/api/v1/community", { method: "POST", body: { body, alias, topic: postTopic } });
                  setBody("");
                  load();
                } catch (ex) {
                  setErr(ex.message);
                }
              }}
            >
              <Input label="Alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
              <label className="mt-3 block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">Topic</span>
                <select
                  className="mt-1 w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5"
                  value={postTopic}
                  onChange={(e) => setPostTopic(e.target.value)}
                >
                  {TOPICS.filter((t) => t.id !== "all").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3">
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a small win or a kind ask…" rows={4} />
              </div>
              {err && <p className="mt-2 text-sm text-rose">{err}</p>}
              <Button className="mt-3">Post thread</Button>
            </form>
          </Card>
        )}
        {rows.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-sage">{p.alias}</p>
              {p.topic && <Badge>{p.topic}</Badge>}
            </div>
            <p className="mt-1 text-sm">{p.body}</p>
            {user && p.alias && (
              <button
                type="button"
                className="mt-2 text-xs text-moss underline"
                onClick={async () => {
                  const data = await api("/api/v1/community/friends", { method: "POST", body: { alias: p.alias } });
                  setFriends(data.friends || []);
                }}
              >
                Be friends
              </button>
            )}
          </Card>
        ))}
      </div>
      <div>
        <Card>
          <h2 className="font-display text-2xl">Friends</h2>
          <p className="mt-1 text-sm text-ink/55">Invite someone by their community alias. They will show up here.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!invite.trim()) return;
              const data = await api("/api/v1/community/friends", { method: "POST", body: { alias: invite.trim() } });
              setFriends(data.friends || []);
              setInvite("");
            }}
          >
            <div className="flex-1">
              <Input placeholder="quiet-mango" value={invite} onChange={(e) => setInvite(e.target.value)} />
            </div>
            <Button>Invite</Button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {friends.map((f) => (
              <li key={f} className="rounded-2xl bg-sand px-3 py-2">
                {f}
              </li>
            ))}
            {friends.length === 0 && <li className="text-ink/45">No friends yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
