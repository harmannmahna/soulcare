import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, Modal } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useJourney } from "../hooks/useJourney";
import { api } from "../api/client";

export default function Dashboard() {
  const { user } = useAuth();
  const { board, weekly, nudges, load, addCheckin } = useJourney();
  const [moodOpen, setMoodOpen] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    load();
    api("/api/v1/community").then(setPosts);
    const seen = sessionStorage.getItem("sc_mood");
    if (!seen) {
      const t = setTimeout(() => setMoodOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, [load]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Holistic board</p>
        <h1 className="font-display text-4xl">Hello, {user?.name || "friend"}</h1>
      </motion.div>

      {nudges?.night_winddown && (
        <Card className="border border-amber/20">
          <p className="font-semibold">Night wind-down</p>
          <p className="text-sm text-ink/65">It’s past your bedtime ({nudges.bedtime}). Dim the lights; the day can wait.</p>
        </Card>
      )}
      {nudges?.focus_nudge && (
        <Card>
          <p className="font-semibold">Focus time</p>
          <p className="text-sm text-ink/65">This is your focus window ({nudges.focus_hours}). A gentle reminder to stay with one thing.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs text-sage">Habit score</p>
          <p className="font-display text-5xl">{board?.habit_score ?? "—"}%</p>
          <Link className="text-sm text-sage" to="/journey">
            Open journey
          </Link>
        </Card>
        <Card>
          <p className="text-xs text-sage">Weekly mood</p>
          <p className="font-display text-5xl">{weekly?.avg_mood || "—"}</p>
          <p className="text-xs text-ink/50">{weekly?.days || 0} check-ins this week</p>
        </Card>
        <Card>
          <p className="text-xs text-sage">Start</p>
          <div className="mt-2 flex flex-col gap-2">
            <Link to="/chat">
              <Button className="w-full">Chat</Button>
            </Link>
            <Link to="/call">
              <Button variant="outline" className="w-full">
                Voice call
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Community (supportive-only)</h2>
          <Link className="text-sm text-sage" to="/community">
            Open feed
          </Link>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {posts.slice(0, 2).map((p) => (
            <p key={p.id}>
              <strong>{p.alias}:</strong> {p.body}
            </p>
          ))}
        </div>
      </Card>

      <Modal
        open={moodOpen}
        title="How are you feeling?"
        onClose={() => {
          sessionStorage.setItem("sc_mood", "1");
          setMoodOpen(false);
        }}
      >
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className="h-10 w-10 rounded-full bg-mist text-sm font-semibold"
              onClick={async () => {
                await addCheckin({ mood: n, sleep_hours: 7, hydration: 5, note: "Quick mood prompt" });
                sessionStorage.setItem("sc_mood", "1");
                setMoodOpen(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
