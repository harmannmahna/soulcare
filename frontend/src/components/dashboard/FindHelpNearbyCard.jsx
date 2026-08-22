import DashCard from "./DashCard";

export default function FindHelpNearbyCard({ onClick }) {
  return (
    <DashCard
      icon="📍"
      title="Find help nearby"
      description="Government lines, NGOs, and wellness centres you can reach today."
      onClick={onClick}
    />
  );
}
