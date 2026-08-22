import DashCard from "./DashCard";

export default function FindTherapistCard({ onClick }) {
  return (
    <DashCard
      icon="🌿"
      title="Find a therapist"
      description="Search by specialty — mental and physical — then book a session."
      onClick={onClick}
    />
  );
}
