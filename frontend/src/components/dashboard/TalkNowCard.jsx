import DashCard from "./DashCard";

export default function TalkNowCard({ onClick }) {
  return (
    <DashCard
      icon="💬"
      title="Talk now"
      description="A calm companion. If things get heavy, we suggest care — or a helpline."
      onClick={onClick}
      accent="from-mist to-sage/20"
    />
  );
}
