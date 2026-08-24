import DashCard from "./DashCard";

export default function TalkNowCard({ onClick }) {
  return (
    <DashCard
      icon="💬"
      title="Talk now"
      description="Type what’s on your mind. If it gets heavy, we suggest care."
      onClick={onClick}
      accent="from-mist to-sage/20"
    />
  );
}
