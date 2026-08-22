import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const PROMPTS = [
  { id: "water", text: "Remember to drink some water 💧", talk: false },
  { id: "talk", text: "I'm here if you want to talk 🌿", talk: true },
  { id: "day", text: "How's your day going so far?", talk: true },
  { id: "stretch", text: "A short stretch can reset your shoulders.", talk: false },
  { id: "food", text: "Have you eaten something gentle today?", talk: false },
  { id: "breath", text: "You're allowed to take one slow breath.", talk: false },
];

function nextDelay() {
  // First check-in arrives quickly so it is visible; later ones stay 20–30 minutes.
  const seen = sessionStorage.getItem("sc_checkin_seen");
  if (!seen) return 12_000;
  return 20 * 60_000 + Math.random() * 10 * 60_000;
}

export default function CheckInPopup() {
  const nav = useNavigate();
  const [prompt, setPrompt] = useState(null);
  const idx = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    function schedule() {
      timer.current = setTimeout(() => {
        setPrompt(PROMPTS[idx.current % PROMPTS.length]);
        idx.current += 1;
        sessionStorage.setItem("sc_checkin_seen", "1");
      }, nextDelay());
    }
    schedule();
    return () => clearTimeout(timer.current);
  }, [prompt === null]);

  if (!prompt) return null;

  function dismiss() {
    setPrompt(null);
  }

  function open() {
    const goTalk = prompt.talk;
    dismiss();
    if (goTalk) nav("/chat");
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] md:bottom-6">
      <button className="absolute inset-0 -z-10 cursor-default" aria-label="Dismiss backdrop" onClick={dismiss} />
      <div className="rounded-3xl bg-foam p-4 shadow-soft ring-1 ring-moss/10">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg leading-snug text-moss">{prompt.text}</p>
          <button type="button" className="rounded-full px-2 text-ink/40 hover:bg-sand" onClick={dismiss} aria-label="Close">
            ×
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="rounded-full bg-moss px-4 py-1.5 text-xs font-semibold text-foam"
            onClick={open}
          >
            {prompt.talk ? "Talk now" : "Okay"}
          </button>
          <button type="button" className="rounded-full px-4 py-1.5 text-xs text-moss hover:bg-sand" onClick={dismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
