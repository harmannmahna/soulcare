import DashCard from "./DashCard";

export default function ExploreWellnessCard({ onClick }) {
  return (
    <DashCard
      icon="🌸"
      title="Explore wellness"
      description="Breathing, food gallery, and exercises with videos."
      onClick={onClick}
    />
  );
}
