import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function Consent() {
  const { user, guest, consent } = useAuth();
  const nav = useNavigate();

  async function accept() {
    if (!user) await guest("hinglish");
    await consent();
    nav("/chat");
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">Before we begin</p>
        <h1 className="mt-2 font-display text-4xl">Consent for a sensitive session</h1>
        <ul className="mt-5 space-y-3 text-sm text-ink/75">
          <li>SoulCare is not a doctor, crisis line, or licensed therapist.</li>
          <li>Messages are risk-classified on the server. We store session + risk metadata, not long-term chat transcripts.</li>
          <li>If you express self-harm intent, we stop the AI and show 112 and Tele-MANAS 14416.</li>
          <li>Guest mode is anonymous and can be upgraded later.</li>
        </ul>
        <div className="mt-6 flex gap-3">
          <Button onClick={accept}>I understand — continue</Button>
          <Button variant="ghost" onClick={() => nav("/")}>
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
