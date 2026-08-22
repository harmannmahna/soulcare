import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { RiskBanner } from "../components/shell";
import { useTalkCompanion } from "../hooks/useTalkCompanion";

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return "";
}

export default function TalkCompanion() {
  const { busy, error, last, presenterUrl, loadConfig, sendTurn } = useTalkCompanion();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Ready when you are");
  const [hint, setHint] = useState("");
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    loadConfig().catch(() => {});
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (last?.video_url && videoRef.current) {
      videoRef.current.src = last.video_url;
      videoRef.current.play().catch(() => {});
      setStatus("Speaking…");
    } else if (last?.reply && last?.video_fallback) {
      setStatus("Reply ready (video fallback)");
    }
  }, [last]);

  async function toggle() {
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }
    if (busy) return;
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
        setStatus("Listening to how you said it…");
        try {
          await sendTurn(blob, hint);
        } catch {
          setStatus("Ready when you are");
        }
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
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
  const showVideo = Boolean(last?.video_url);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Live companion</p>
        <h1 className="font-display text-4xl">Talk to Companion</h1>
        <p className="mt-2 text-sm text-ink/60">
          A video call with a speaking avatar. Your raw audio is scored for tone, then discarded — we never store the
          recording.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="relative aspect-[4/5] bg-moss/10 sm:aspect-video">
          {showVideo ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover object-top"
              autoPlay
              playsInline
              onEnded={() => setStatus("Ready when you are")}
            />
          ) : (
            <img
              src={presenterUrl || "/favicon.svg"}
              alt="Companion"
              className="h-full w-full object-cover object-top"
            />
          )}
          {last?.video_fallback && last?.reply && !showVideo && (
            <div className="absolute inset-x-0 bottom-0 bg-foam/90 p-4 text-sm text-ink">
              <p className="text-xs uppercase tracking-wider text-sage">Spoken reply (video fallback)</p>
              <p className="mt-1">{last.reply}</p>
            </div>
          )}
        </div>
        <div className="space-y-3 p-5">
          <RiskBanner tier={risk.tier} />
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
          <div className="flex justify-center">
            <Button onClick={toggle} disabled={busy} variant={listening ? "danger" : "primary"}>
              {listening ? "Stop & send" : busy ? "Working…" : "Hold space / speak"}
            </Button>
          </div>
          {last?.hume_ok === false && last?.ok && (
            <p className="text-center text-[11px] text-ink/45">
              Tone analysis was unavailable that turn — we still used the spoken words and the existing safety rail.
            </p>
          )}
        </div>
      </Card>

      <p className="text-center text-xs text-ink/45">
        Text chat is unchanged — <Link className="underline" to="/chat">Talk now</Link> is still there.
      </p>
    </div>
  );
}
