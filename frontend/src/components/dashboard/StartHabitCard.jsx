import DashCard from "./DashCard";

export default function StartHabitCard({ onClick }) {
  return (
    <DashCard
      icon="🔥"
      title="Start a habit"
      description="Daily streaks, a calendar for each habit, and a monthly look-back."
      onClick={onClick}
    />
  );
}
