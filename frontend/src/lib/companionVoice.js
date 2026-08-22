export function speakWithCharacter(text, character) {
  if (!window.speechSynthesis || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = character?.voiceLang || "en-IN";
  utter.rate = Number(character?.rate) || 0.95;
  utter.pitch = Number(character?.pitch) || 1;
  const voices = window.speechSynthesis.getVoices() || [];
  const hint = (character?.voiceHint || "").toLowerCase();
  const lang = (character?.voiceLang || "en").toLowerCase();
  const match =
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang) && (!hint || v.name.toLowerCase().includes(hint))) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
  if (match) utter.voice = match;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function estimateVocalFeatures({ durationMs, wordCount, rmsVariance, pauseRatio }) {
  const seconds = Math.max((durationMs || 0) / 1000, 0.4);
  const speechRate = wordCount ? wordCount / seconds : 0;
  const pitchVariance = Number(rmsVariance) || 0;
  const pause = Number(pauseRatio) || 0;
  if (!speechRate && !pitchVariance && !pause) return null;
  return {
    speech_rate: Number(speechRate.toFixed(2)),
    pitch_variance: Number(pitchVariance.toFixed(2)),
    pause_ratio: Number(Math.min(1, Math.max(0, pause)).toFixed(2)),
  };
}
