import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { RiskBanner } from "../components/shell";
import CompanionOrb from "../components/CompanionOrb";
import { useTalkCompanion } from "../hooks/useTalkCompanion";

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return "";
}

function pickVoice(preferHinglish) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const natural = (v) => /google|natural|neural|premium/i.test(v.name || "");
  if (preferHinglish) {
    return (
      voices.find((v) => /^hi(-|_|$)/i.test(v.lang) && natural(v)) ||
      voices.find((v) => /^hi(-|_|$)/i.test(v.lang)) ||
      voices.find((v) => /^en(-|_)IN/i.test(v.lang) && natural(v)) ||
      voices.find((v) => /^en(-|_)IN/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang))
    );
  }
  return (
    voices.find((v) => /^en(-|_)IN/i.test(v.lang) && natural(v)) ||
    voices.find((v) => /^en(-|_)IN/i.test(v.lang)) ||
    voices.find((v) => /^en(-|_|$)/i.test(v.lang) && /GB|IN|US|AU/i.test(v.lang) && natural(v)) ||
    voices.find((v) => /^en(-|_|$)/i.test(v.lang) && /US|GB|IN|AU/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang))
  );
}

function looksHinglish(text) {
  const raw = text || "";
  if (/[\u0900-\u097f]/.test(raw)) return true;
  const tokens = new Set((raw.toLowerCase().match(/[a-z']+/g) || []));
  const markers = ["hai", "hoon", "hain", "nahi", "yaar", "bahut", "kya", "mera", "tum", "theek", "padhai", "tension", "dil", "abhi", "kaise"];
  return markers.filter((m) => tokens.has(m)).length >= 2;
}

function splitSpoken(text) {
  const parts = String(text || "")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

export default function TalkCompanion() {
  const { busy, error, last, messages, sendTurn, resetConversation } = useTalkCompanion();
  const [live, setLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [status, setStatus] = useState("Tap the orb when you’re ready");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const liveRef = useRef(false);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const recRef = useRef(null);
  const speechRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const hintRef = useRef("");
  const audioRef = useRef(null);
  const genRef = useRef(0);
  const speakGenRef = useRef(0);
  const silenceRef = useRef(0);
  const logRef = useRef(null);
  const finishRef = useRef(null);

  busyRef.current = busy;
  speakingRef.current = speaking;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim]);

  function stopAudioGraph() {
    const graph = audioRef.current;
    if (!graph) return;
    if (graph.raf) cancelAnimationFrame(graph.raf);
    try {
      graph.osc?.stop();
    } catch {
      /* already stopped */
    }
    graph.ctx?.close().catch(() => {});
    audioRef.current = null;
    setAmplitude(0);
  }

  function startAmplitudeGraph() {
    stopAudioGraph();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 190;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(analyser);
    osc.start();
    const data = new Uint8Array(analyser.frequencyBinCount);
    const graph = { ctx, analyser, osc, gain, raf: 0 };
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
      setAmplitude(Math.min(1, avg / 90));
      graph.raf = requestAnimationFrame(tick);
    };
    graph.raf = requestAnimationFrame(tick);
    audioRef.current = graph;
  }

  function bumpSpeech() {
    const graph = audioRef.current;
    if (!graph) return;
    const now = graph.ctx.currentTime;
    graph.gain.gain.cancelScheduledValues(now);
    graph.gain.gain.setTargetAtTime(0.55, now, 0.01);
    graph.gain.gain.setTargetAtTime(0.06, now + 0.09, 0.05);
  }

  function stopListenHardware() {
    window.clearTimeout(silenceRef.current);
    try {
      speechRef.current?.stop();
    } catch {
      /* ignore */
    }
    speechRef.current = null;
    if (recRef.current && recRef.current.state !== "inactive") {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recRef.current = null;
    setListening(false);
  }

  function cancelSpeak() {
    speakGenRef.current += 1;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    speakingRef.current = false;
    stopAudioGraph();
  }

  function endCall() {
    genRef.current += 1;
    liveRef.current = false;
    setLive(false);
    stopListenHardware();
    cancelSpeak();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setInterim("");
    setStatus("Call ended — tap the orb to start again");
  }

  function speakReply(text, { onBoundary, onEnd }) {
    if (!window.speechSynthesis || !text) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const token = ++speakGenRef.current;
    const hinglish = looksHinglish(text);
    const voice = pickVoice(hinglish);
    const parts = splitSpoken(text);
    let i = 0;

    const speakNext = () => {
      if (token !== speakGenRef.current) return;
      if (i >= parts.length) {
        onEnd?.();
        return;
      }
      const utter = new SpeechSynthesisUtterance(parts[i]);
      utter.lang = hinglish ? "hi-IN" : "en-IN";
      utter.rate = 0.9;
      utter.pitch = 0.98;
      if (voice) utter.voice = voice;
      utter.onboundary = () => onBoundary?.();
      utter.onerror = () => {
        if (token === speakGenRef.current) onEnd?.();
      };
      utter.onend = () => {
        if (token !== speakGenRef.current) return;
        i += 1;
        if (i < parts.length) window.setTimeout(speakNext, 140);
        else onEnd?.();
      };
      window.speechSynthesis.speak(utter);
    };
    speakNext();
  }

  async function handleReply(data, gen) {
    if (gen !== genRef.current || !liveRef.current) return;
    if (data?.risk?.tier === "red") {
      setStatus("Safety first — no spoken reply");
      liveRef.current = false;
      setLive(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    if (data?.reply) {
      setStatus("Tap to skip");
      setSpeaking(true);
      speakingRef.current = true;
      startAmplitudeGraph();
      speakReply(data.reply, {
        onBoundary: bumpSpeech,
        onEnd: () => {
          if (gen !== genRef.current) return;
          setSpeaking(false);
          speakingRef.current = false;
          stopAudioGraph();
          if (liveRef.current) {
            setStatus("I'm listening");
            listenCycle();
          }
        },
      });
    } else if (liveRef.current) {
      listenCycle();
    }
  }

  async function listenCycle() {
    if (!liveRef.current || busyRef.current || speakingRef.current) return;
    const gen = genRef.current;
    let stream = streamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch {
        setStatus("Allow the microphone, or type a line below.");
        return;
      }
    }

    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    hintRef.current = "";
    setInterim("");
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setStatus("I'm listening — pause, or tap Send");

    let closed = false;
    const finishUtterance = async () => {
      if (closed || gen !== genRef.current) return;
      closed = true;
      window.clearTimeout(silenceRef.current);
      try {
        speechRef.current?.stop();
      } catch {
        /* ignore */
      }
      speechRef.current = null;
      if (rec.state !== "inactive") {
        await new Promise((resolve) => {
          rec.onstop = () => resolve();
          try {
            rec.stop();
          } catch {
            resolve();
          }
        });
      }
      recRef.current = null;
      setListening(false);
      if (!liveRef.current || gen !== genRef.current) return;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      const hint = hintRef.current.trim();
      if (blob.size < 800 && !hint) {
        listenCycle();
        return;
      }
      setStatus("One moment…");
      try {
        const data = await sendTurn(blob, hint);
        await handleReply(data, gen);
      } catch {
        setStatus("That didn’t go through — try again, or type a line.");
        if (liveRef.current && gen === genRef.current) listenCycle();
      }
    };
    finishRef.current = finishUtterance;

    const armSilence = () => {
      window.clearTimeout(silenceRef.current);
      if (!hintRef.current.trim()) return;
      silenceRef.current = window.setTimeout(() => finishUtterance(), 1400);
    };

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("Tap Send when you’re done talking.");
      return;
    }

    const attachSpeech = () => {
      if (!liveRef.current || closed || gen !== genRef.current) return;
      const speech = new SR();
      speech.lang = "en-IN";
      speech.interimResults = true;
      speech.continuous = true;
      speech.onresult = (e) => {
        let finalText = "";
        let liveText = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const piece = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += `${piece} `;
          else liveText += piece;
        }
        if (finalText.trim()) hintRef.current = `${hintRef.current} ${finalText}`.trim();
        setInterim((hintRef.current ? `${hintRef.current} ` : "") + liveText);
        armSilence();
      };
      speech.onerror = () => {};
      speech.onend = () => {
        speechRef.current = null;
        if (!closed && liveRef.current && gen === genRef.current) {
          window.setTimeout(attachSpeech, 120);
        }
      };
      speechRef.current = speech;
      try {
        speech.start();
      } catch {
        window.setTimeout(() => finishUtterance(), 1800);
      }
    };
    attachSpeech();
    silenceRef.current = window.setTimeout(() => {
      if (!hintRef.current.trim()) return;
      finishUtterance();
    }, 22000);
  }

  function sendNow() {
    if (finishRef.current) finishRef.current();
    else {
      window.clearTimeout(silenceRef.current);
      try {
        speechRef.current?.stop();
      } catch {
        /* ignore */
      }
      if (recRef.current && recRef.current.state !== "inactive") {
        try {
          recRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    }
  }

  function skipSpeaking() {
    if (!speakingRef.current) return;
    cancelSpeak();
    if (liveRef.current) {
      setStatus("I'm listening");
      listenCycle();
    }
  }

  async function startCall() {
    resetConversation();
    genRef.current += 1;
    liveRef.current = true;
    setLive(true);
    setStatus("I'm listening");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      liveRef.current = true;
      setLive(true);
      setStatus("No mic yet — type a line below, or allow the microphone.");
      return;
    }
    listenCycle();
  }

  function onOrbTap() {
    if (speaking) {
      skipSpeaking();
      return;
    }
    if (!live) {
      startCall();
      return;
    }
    if (listening) sendNow();
  }

  async function sendTypedLine(e) {
    e.preventDefault();
    const line = typed.trim();
    if (!line || busy) return;
    setTyped("");
    if (!live) {
      liveRef.current = true;
      setLive(true);
    }
    stopListenHardware();
    cancelSpeak();
    const gen = ++genRef.current;
    setStatus("One moment…");
    try {
      const data = await sendTurn(null, line);
      await handleReply(data, gen);
    } catch {
      setStatus("That didn’t go through — try again.");
    }
  }

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices?.();
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      liveRef.current = false;
      genRef.current += 1;
      stopListenHardware();
      stopAudioGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  const risk = last?.risk || { tier: "green" };
  const mode = !live ? "idle" : listening ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";
  const modeLabel = !live ? "Ready" : listening ? "Listening" : busy ? "Thinking" : speaking ? "Speaking" : "Ready";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Voice companion</p>
        <h1 className="font-display text-4xl font-semibold">Talk to Companion</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          Tap the orb, speak, and pause — it answers, then listens again. Prefer typing? Use the box below.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 py-7">
        <button
          type="button"
          onClick={onOrbTap}
          className="rounded-full outline-none ring-sage/0 transition focus-visible:ring-4"
          aria-label={live ? (speaking ? "Skip reply" : listening ? "Send what I said" : "Companion") : "Start talking"}
        >
          <CompanionOrb mode={mode} amplitude={amplitude} />
        </button>
        <span className="rounded-full bg-mist px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sage">
          {modeLabel}
        </span>
        <RiskBanner tier={risk.tier} compact={risk.tier === "green"} />
        <p className="min-h-[1.25rem] text-center text-sm text-ink/65" aria-live="polite">
          {busy ? "One moment…" : status}
        </p>
        {error && <p className="text-center text-sm text-rose">{error}</p>}

        <div ref={logRef} className="max-h-56 w-full space-y-2 overflow-y-auto px-1">
          {messages.length === 0 && !interim && (
            <p className="text-center text-xs text-ink/40">Your words will show up here as you talk.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-moss text-sand" : "bg-mist text-ink"
              }`}
            >
              <p className="mb-0.5 text-[10px] uppercase tracking-wider opacity-70">{m.role === "user" ? "You" : "Companion"}</p>
              {m.text}
            </div>
          ))}
          {interim && live && (
            <div className="ml-auto max-w-[90%] rounded-2xl bg-moss/70 px-3 py-2 text-sm text-sand">
              <p className="mb-0.5 text-[10px] uppercase tracking-wider opacity-70">You</p>
              {interim}
            </div>
          )}
        </div>

        {risk.tier === "red" && (
          <div className="flex flex-wrap justify-center gap-2">
            <a href="tel:112">
              <Button variant="danger">Call 112</Button>
            </a>
            <a href="tel:14416">
              <Button variant="amber">Call Tele-MANAS 14416</Button>
            </a>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {!live ? (
            <Button onClick={startCall}>Start talking</Button>
          ) : (
            <>
              {listening && (
                <Button onClick={sendNow} disabled={busy}>
                  Send
                </Button>
              )}
              {speaking && (
                <Button variant="outline" onClick={skipSpeaking}>
                  Skip
                </Button>
              )}
              <Button variant="danger" onClick={endCall}>
                End call
              </Button>
            </>
          )}
        </div>

        <form className="flex w-full gap-2" onSubmit={sendTypedLine}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Or type a line…"
            className="field flex-1"
            disabled={busy || risk.tier === "red"}
            aria-label="Type a message to the companion"
          />
          <Button type="submit" disabled={busy || !typed.trim() || risk.tier === "red"}>
            Send
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-ink/45">
        Prefer typing the whole way?{" "}
        <Link className="underline decoration-sage/40 underline-offset-2" to="/chat">
          Open Talk now
        </Link>
      </p>
    </div>
  );
}
