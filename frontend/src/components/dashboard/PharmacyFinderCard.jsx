import DashCard from "./DashCard";

export default function PharmacyFinderCard({ onClick }) {
  return (
    <DashCard
      icon="💊"
      title="Pharmacy"
      description="Sort by store or distance. See which medicines are on the shelf."
      onClick={onClick}
    />
  );
}
