import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BreathingOrb, Particles } from "../components/visuals";
import { Button, Card, Input } from "../components/ui";
import { RiskBanner } from "../components/shell";
import { useChat } from "../hooks/useChat";

export default function Chat() {
  const { messages, risk, matches, busy, error, send } = useChat();
  const [text, setText] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const next = text;
    setText("");
    await send(next, "chat").catch(() => setText(next));
  }

  return (
    <div className="relative grid gap-5 lg:grid-cols-[1fr_280px]">
      <Particles count={18} />
      <Card className="relative min-h-[70vh]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Companion</h1>
            <p className="text-sm text-ink/60">Classified on the server before any model sees it.</p>
          </div>
          <BreathingOrb active={busy} risk={risk.tier} className="h-24 w-24" />
        </div>
        <div className="mt-4">
          <RiskBanner tier={risk.tier} />
        </div>
        <div className="mt-5 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-ink/55">
              Try a green check-in, yellow exam stress, or (for judges) a red phrase like “I want to kill myself” to
              see the hard safety stop.
            </p>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user" ? "ml-auto bg-moss text-foam" : "bg-mist/80 text-ink"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
        </div>
        {risk.tier === "red" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="tel:112">
              <Button variant="danger">Call 112</Button>
            </a>
            <a href="tel:14416">
              <Button variant="amber">Call Tele-MANAS 14416</Button>
            </a>
          </div>
        )}
        <form className="mt-5 flex gap-2" onSubmit={onSubmit}>
          <div className="flex-1">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share what’s here…" />
          </div>
          <Button disabled={busy}>{busy ? "…" : "Send"}</Button>
        </form>
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}
      </Card>
      <aside className="space-y-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage">Matched care</p>
          {matches.length === 0 && <p className="mt-2 text-sm text-ink/55">Yellow-tier chats surface specialists here.</p>}
          {matches.map((t) => (
            <Link key={t.id} to={`/therapists/${t.id}`} className="mt-3 block rounded-2xl bg-sand p-3">
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-ink/60">{t.tags?.join(" · ")}</p>
              <p className="text-xs text-sage">₹{t.price_inr} · {t.city}</p>
            </Link>
          ))}
        </Card>
      </aside>
    </div>
  );
}
