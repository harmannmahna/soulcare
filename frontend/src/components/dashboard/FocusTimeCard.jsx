import DashCard from "./DashCard";

export default function FocusTimeCard({ onClick }) {
  return (
    <DashCard
      icon="⏱️"
      title="Focus time"
      description="Pomodoro sessions earn points you can spend decorating your room."
      onClick={onClick}
    />
  );
}
