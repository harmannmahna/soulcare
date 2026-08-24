import DashCard from "./DashCard";

export default function TalkCompanionCard({ onClick }) {
  return (
    <DashCard
      icon="🎙️"
      title="Talk to Companion"
      description="Speak or type. A calm orb answers — no video."
      onClick={onClick}
      accent="from-mist to-moss/15"
    />
  );
}
