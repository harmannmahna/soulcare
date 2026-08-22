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

function englishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((v) => /^en(-|_|$)/i.test(v.lang) && /US|GB|IN|AU/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
}

function speakEnglish(text, { onBoundary, onEnd }) {
  if (!window.speechSynthesis || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.96;
  utter.pitch = 1;
  const voice = englishVoice();
  if (voice) utter.voice = voice;
  utter.onboundary = () => onBoundary?.();
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

export default function TalkCompanion() {
  const { busy, error, last, messages, sendTurn, resetConversation } = useTalkCompanion();
  const [live, setLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [status, setStatus] = useState("Tap start, then just talk");
  const [interim, setInterim] = useState("");
  const liveRef = useRef(false);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const recRef = useRef(null);
  const speechRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const hintRef = useRef("");
  const audioRef = useRef(null);

  busyRef.current = busy;
  speakingRef.current = speaking;

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

  function endCall() {
    liveRef.current = false;
    setLive(false);
    stopListenHardware();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    stopAudioGraph();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setInterim("");
    setStatus("Call ended");
  }

  async function listenCycle() {
    if (!liveRef.current || busyRef.current || speakingRef.current) return;
    let stream = streamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch {
        setStatus("Microphone permission is needed to talk.");
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
    setStatus("Listening…");

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let closed = false;
    const finishUtterance = async () => {
      if (closed) return;
      closed = true;
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
      if (!liveRef.current) return;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      const hint = hintRef.current.trim();
      if (blob.size < 800 && !hint) {
        listenCycle();
        return;
      }
      setStatus("Thinking…");
      try {
        const data = await sendTurn(blob, hint);
        if (!liveRef.current) return;
        if (data?.risk?.tier === "red") {
          setStatus("Safety first — no spoken reply");
          liveRef.current = false;
          setLive(false);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }
        if (data?.reply) {
          setStatus("Speaking…");
          setSpeaking(true);
          speakingRef.current = true;
          startAmplitudeGraph();
          speakEnglish(data.reply, {
            onBoundary: bumpSpeech,
            onEnd: () => {
              setSpeaking(false);
              speakingRef.current = false;
              stopAudioGraph();
              if (liveRef.current) {
                setStatus("Listening…");
                listenCycle();
              }
            },
          });
        } else if (liveRef.current) {
          listenCycle();
        }
      } catch {
        if (liveRef.current) listenCycle();
      }
    };

    if (!SR) {
      setStatus("This browser has no speech recognition. Speak, then tap End when you want to stop — wait, tap Start again after a pause.");
      window.setTimeout(() => {
        if (liveRef.current) finishUtterance();
      }, 5000);
      return;
    }

    const speech = new SR();
    speech.lang = "en-US";
    speech.interimResults = true;
    speech.continuous = false;
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
    };
    speech.onerror = () => {};
    speech.onend = () => {
      speechRef.current = null;
      finishUtterance();
    };
    speechRef.current = speech;
    try {
      speech.start();
    } catch {
      window.setTimeout(() => finishUtterance(), 1600);
    }
  }

  async function startCall() {
    resetConversation();
    liveRef.current = true;
    setLive(true);
    setStatus("Listening…");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      liveRef.current = false;
      setLive(false);
      setStatus("Microphone permission is needed to talk.");
      return;
    }
    listenCycle();
  }

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices?.();
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      liveRef.current = false;
      stopListenHardware();
      stopAudioGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  const risk = last?.risk || { tier: "green" };
  const mode = !live ? "idle" : listening ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Live companion</p>
        <h1 className="font-display text-4xl">Talk to Companion</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          One tap to start. Keep talking — it listens, answers, and listens again. English only. End when you want to
          stop.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-5 py-8">
        <CompanionOrb mode={mode} amplitude={amplitude} />
        <RiskBanner tier={risk.tier} />
        <p className="text-center text-sm text-ink/60">{busy ? "Thinking…" : status}</p>
        {error && <p className="text-center text-sm text-rose">{error}</p>}

        <div className="max-h-64 w-full space-y-2 overflow-y-auto px-1">
          {messages.length === 0 && !interim && (
            <p className="text-center text-xs text-ink/40">What you say and what I say will appear here.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-moss text-foam" : "bg-mist text-ink"
              }`}
            >
              <p className="mb-0.5 text-[10px] uppercase tracking-wider opacity-70">{m.role === "user" ? "You" : "Companion"}</p>
              {m.text}
            </div>
          ))}
          {interim && live && (
            <div className="ml-auto max-w-[90%] rounded-2xl bg-moss/70 px-3 py-2 text-sm text-foam">
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
            <Button onClick={startCall}>Start conversation</Button>
          ) : (
            <Button variant="danger" onClick={endCall}>
              End
            </Button>
          )}
        </div>
        {last?.hume_ok === false && last?.ok && (
          <p className="text-center text-[11px] text-ink/45">
            Tone analysis was unavailable that turn — we still used the spoken words and the existing safety rail.
          </p>
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
