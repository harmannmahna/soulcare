import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { RiskBanner } from "../components/shell";
import CompanionOrb from "../components/CompanionOrb";
import { useTalkCompanion } from "../hooks/useTalkCompanion";

const IDLE_MS = 30000;
const GOODBYE = "I'll let you go for now. Take care of yourself today.";
const QUOTES = [
  "Rest is not a reward you earn after surviving the day. It is part of staying well.",
  "You do not have to solve everything before you put the phone down.",
  "Small honest check-ins count more than perfect weeks.",
  "Your mind is allowed to be tired. That is information, not failure.",
];

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return "";
}

function speakText(text, { onBoundary, onEnd }) {
  if (!window.speechSynthesis || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.96;
  utter.pitch = 1;
  utter.lang = "en-IN";
  utter.onboundary = () => onBoundary?.();
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

export default function TalkCompanion() {
  const { busy, error, last, sendTurn } = useTalkCompanion();
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [status, setStatus] = useState("Ready when you are");
  const [hint, setHint] = useState("");
  const [ended, setEnded] = useState(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const idleRef = useRef(null);
  const audioRef = useRef(null);

  function clearIdle() {
    if (idleRef.current) window.clearTimeout(idleRef.current);
    idleRef.current = null;
  }

  function armIdle() {
    clearIdle();
    idleRef.current = window.setTimeout(() => {
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setEnded({ goodbye: GOODBYE, quote });
      setStatus("Session closed");
      speakText(`${GOODBYE} ${quote}`, { onEnd: () => setSpeaking(false) });
      setSpeaking(true);
    }, IDLE_MS);
  }

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

  useEffect(() => {
    return () => {
      clearIdle();
      stopAudioGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!last?.ok || !last.reply) return;
    if (last.risk?.tier === "red") {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      setStatus("Safety first — no spoken reply");
      return;
    }
    setStatus("Speaking…");
    setSpeaking(true);
    startAmplitudeGraph();
    speakText(last.reply, {
      onBoundary: bumpSpeech,
      onEnd: () => {
        setSpeaking(false);
        stopAudioGraph();
        setStatus("Ready when you are");
        armIdle();
      },
    });
  }, [last]);

  async function toggle() {
    if (ended) return;
    clearIdle();
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }
    if (busy || speaking) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        setListening(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setStatus("Thinking…");
        try {
          await sendTurn(blob, hint);
        } catch {
          setStatus("Ready when you are");
          armIdle();
        }
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
      setHint("");
      setStatus("Listening… speak, then tap again to send");
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const speech = new SR();
        speech.lang = "en-IN";
        speech.interimResults = false;
        speech.onresult = (e) => setHint(e.results[0][0].transcript);
        try {
          speech.start();
        } catch {
          /* optional hint only */
        }
      }
    } catch {
      setStatus("Microphone permission is needed to talk.");
    }
  }

  const risk = last?.risk || { tier: "green" };
  const mode = ended ? "idle" : listening ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Live companion</p>
        <h1 className="font-display text-4xl">Talk to Companion</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          Speak out loud. Tone is scored for safety, then discarded. The orb is only a pulse — no video, no 3D.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-5 py-10">
        <CompanionOrb mode={mode} amplitude={amplitude} />
        <RiskBanner tier={risk.tier} />
        {ended ? (
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold">{ended.goodbye}</p>
            <p className="mt-2 text-sm italic text-ink/60">“{ended.quote}”</p>
            <Button
              className="mt-4"
              onClick={() => {
                setEnded(null);
                setStatus("Ready when you are");
              }}
            >
              Talk again
            </Button>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-ink/60">{busy ? "Thinking…" : status}</p>
            {error && <p className="text-center text-sm text-rose">{error}</p>}
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
            {last?.reply && risk.tier !== "red" && (
              <p className="max-w-md text-center text-sm text-ink/70">{last.reply}</p>
            )}
            {risk.tier === "red" && last?.reply && (
              <p className="max-w-md whitespace-pre-wrap text-center text-sm text-ink/80">{last.reply}</p>
            )}
            <Button onClick={toggle} disabled={busy || speaking} variant={listening ? "danger" : "primary"}>
              {listening ? "Stop & send" : busy ? "Working…" : "Hold space / speak"}
            </Button>
            {last?.hume_ok === false && last?.ok && (
              <p className="text-center text-[11px] text-ink/45">
                Tone analysis was unavailable that turn — we still used the spoken words and the existing safety rail.
              </p>
            )}
          </>
        )}
      </Card>

      <p className="text-center text-xs text-ink/45">
        Text chat is unchanged —{" "}
        <Link className="underline" to="/chat">
          Talk now
        </Link>{" "}
        is still there.
      </p>
    </div>
  );
}
