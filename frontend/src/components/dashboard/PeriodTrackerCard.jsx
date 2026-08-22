import DashCard from "./DashCard";

export default function PeriodTrackerCard({ onClick }) {
  return (
    <DashCard
      icon="🌙"
      title="Period tracker"
      description="Mark your days on a calm calendar. Drag or tap to log a cycle."
      onClick={onClick}
      accent="from-rose-50 to-mist"
    />
  );
}
