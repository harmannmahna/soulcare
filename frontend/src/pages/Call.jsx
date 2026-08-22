import { useEffect, useRef, useState } from "react";
import { BreathingOrb } from "../components/visuals";
import { Button, Card } from "../components/ui";
import { RiskBanner } from "../components/shell";
import { useChat } from "../hooks/useChat";

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export default function Call() {
  const { messages, risk, busy, send } = useChat();
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") speak(last.text);
  }, [messages]);

  function toggle() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      send("I feel a bit anxious today", "call");
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      send(text, "call");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <Card className="mx-auto max-w-xl text-center">
      <h1 className="font-display text-4xl">Voice companion</h1>
      <p className="mt-2 text-sm text-ink/60">Same risk pipeline as chat. Browser speech in, spoken reply out.</p>
      <BreathingOrb active={listening || busy} risk={risk.tier} className="mx-auto h-64" />
      <div className="mt-2">
        <RiskBanner tier={risk.tier} />
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={toggle}>{listening ? "Stop listening" : "Hold space / speak"}</Button>
        {risk.tier === "red" && (
          <a href="tel:14416">
            <Button variant="danger">Call 14416</Button>
          </a>
        )}
      </div>
      <p className="mt-4 text-xs text-ink/50">No Web Speech API? A demo line is sent instead.</p>
      <div className="mt-6 space-y-2 text-left text-sm">
        {messages.slice(-4).map((m, i) => (
          <p key={i} className={m.role === "user" ? "text-moss" : "text-ink/80"}>
            <strong>{m.role === "user" ? "You" : "SoulCare"}:</strong> {m.text}
          </p>
        ))}
      </div>
    </Card>
  );
}
