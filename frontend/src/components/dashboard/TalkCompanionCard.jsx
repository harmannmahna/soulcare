import DashCard from "./DashCard";

export default function TalkCompanionCard({ onClick }) {
  return (
    <DashCard
      icon="🎙️"
      title="Talk to Companion"
      description="Speak out loud. A live avatar answers with real lip-sync — like a video call."
      onClick={onClick}
      accent="from-mist to-moss/15"
    />
  );
}
