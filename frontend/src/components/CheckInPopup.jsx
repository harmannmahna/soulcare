import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const PROMPTS = [
  { id: "water", category: "hydration", icon: "💧", text: "A sip of water would be a kindness to your body.", talk: false },
  { id: "breath", category: "breath", icon: "🌬️", text: "One slow breath in, one longer breath out. That’s enough.", talk: false },
  { id: "mood", category: "mood", icon: "🌤️", text: "How is the weather inside you right now?", talk: true },
  { id: "talk", category: "talk", icon: "🌿", text: "Still here if you want to talk. No performance needed.", talk: true },
  { id: "stretch", category: "body", icon: "🙆", text: "Unhook your shoulders for ten seconds.", talk: false },
  { id: "food", category: "food", icon: "🍵", text: "Have you had something gentle to eat or drink?", talk: false },
  { id: "encourage", category: "encourage", icon: "✨", text: "You showed up. That already counts.", talk: false },
  { id: "rest", category: "rest", icon: "🌙", text: "If you can, rest your eyes for one screen-free minute.", talk: false },
  { id: "here", category: "talk", icon: "🌿", text: "No agenda. Just checking you’re okay.", talk: true },
  { id: "yellow", category: "talk", icon: "🌿", text: "That last chat sounded heavy. Want a gentler check-in?", talk: true },
];

const TINT = {
  hydration: "ring-sky-200",
  breath: "ring-teal-200",
  mood: "ring-amber-200",
  talk: "ring-moss/20",
  body: "ring-orange-200",
  food: "ring-lime-200",
  encourage: "ring-violet-200",
  rest: "ring-indigo-200",
};

function nextDelay() {
  const seen = sessionStorage.getItem("sc_checkin_seen");
  if (!seen) return 12_000;
  return 20 * 60_000 + Math.random() * 10 * 60_000;
}

export default function CheckInPopup() {
  const nav = useNavigate();
  const [prompt, setPrompt] = useState(null);
  const idx = useRef(0);
  const timer = useRef(null);
  const idle = useRef(null);
  const visible = useRef(false);

  function show(next) {
    if (visible.current) return;
    visible.current = true;
    setPrompt(next);
    sessionStorage.setItem("sc_checkin_seen", "1");
  }

  useEffect(() => {
    function schedule() {
      timer.current = setTimeout(() => {
        const pool = PROMPTS.filter((p) => p.id !== "yellow");
        show(pool[idx.current % pool.length]);
        idx.current += 1;
      }, nextDelay());
    }
    if (!prompt) schedule();
    return () => clearTimeout(timer.current);
  }, [prompt === null]);

  useEffect(() => {
    function bumpIdle() {
      clearTimeout(idle.current);
      idle.current = setTimeout(() => {
        const pool = PROMPTS.filter((p) => p.id !== "yellow");
        show(pool[idx.current % pool.length]);
        idx.current += 1;
      }, 75_000);
    }
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, bumpIdle, { passive: true }));
    bumpIdle();
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bumpIdle));
      clearTimeout(idle.current);
    };
  }, []);

  useEffect(() => {
    function onYellow() {
      show(PROMPTS.find((p) => p.id === "yellow"));
    }
    window.addEventListener("soulcare:checkin", onYellow);
    return () => window.removeEventListener("soulcare:checkin", onYellow);
  }, []);

  if (!prompt) return null;

  function dismiss() {
    visible.current = false;
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
      <div className={`rounded-3xl bg-foam p-4 shadow-soft ring-1 ${TINT[prompt.category] || "ring-moss/10"}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg leading-snug text-moss">
            <span className="mr-2" aria-hidden>
              {prompt.icon}
            </span>
            {prompt.text}
          </p>
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
