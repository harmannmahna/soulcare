import DashCard from "./DashCard";

export default function TalkCompanionCard({ onClick }) {
  return (
    <DashCard
      icon="🎙️"
      title="Talk to Companion"
      description="Speak out loud. A simple voice orb answers — tone-aware, no video."
      onClick={onClick}
      accent="from-mist to-moss/15"
    />
  );
}
