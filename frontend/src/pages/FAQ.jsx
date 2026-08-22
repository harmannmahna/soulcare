import { Card } from "../components/ui";

const QA = [
  ["Is SoulCare a therapist?", "No. It is a companion with a hard safety layer. Yellow-tier chats can match you to a human therapist."],
  ["What happens on red risk?", "No LLM is called. You see a fixed script and 112 / Tele-MANAS 14416. Admins get a live WebSocket alert."],
  ["Do you store my chats?", "We persist session and risk metadata (tier, rule, action, time) — not long-term raw transcripts."],
  ["Can I use it without signing up?", "Yes. Guest mode + consent, then upgrade later if you want history on a real account."],
  ["What’s real vs demo?", "Chat triage, auth, therapists/booking, resources, journey/habits, and admin alerts are real. Pharmacy, prescriptions, counsellor handoff, and calorie photos are demo-scoped."],
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-4xl">FAQ</h1>
      <div className="mt-6 space-y-3">
        {QA.map(([q, a]) => (
          <Card key={q}>
            <p className="font-semibold">{q}</p>
            <p className="mt-2 text-sm text-ink/70">{a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
