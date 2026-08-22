import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { useBooking } from "../hooks/useBooking";

export default function Booking() {
  const loc = useLocation();
  const nav = useNavigate();
  const { create } = useBooking();
  const state = loc.state;

  if (!state?.therapist_id) {
    return (
      <Card>
        <p>Pick a therapist slot first.</p>
        <Button className="mt-3" onClick={() => nav("/therapists")}>
          Browse
        </Button>
      </Card>
    );
  }

  async function confirm() {
    const row = await create({ therapist_id: state.therapist_id, slot_id: state.slot_id });
    nav("/booking/confirmation", { state: row });
  }

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl">Confirm booking</h1>
      <p className="mt-3 text-sm">
        {state.name}
        <br />
        {state.label}
      </p>
      <Button className="mt-6" onClick={confirm}>
        Confirm session
      </Button>
    </Card>
  );
}
