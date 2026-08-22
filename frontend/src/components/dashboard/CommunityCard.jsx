import DashCard from "./DashCard";

export default function CommunityCard({ onClick }) {
  return (
    <DashCard
      icon="🤝"
      title="Community"
      description="Threads you can sort — women, mental health, habits — and friends to invite."
      onClick={onClick}
    />
  );
}
