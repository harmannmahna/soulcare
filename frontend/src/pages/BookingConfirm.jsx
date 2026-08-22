import { Link, useLocation } from "react-router-dom";
import { Button, Card } from "../components/ui";

export default function BookingConfirm() {
  const row = useLocation().state || {};
  return (
    <Card className="mx-auto max-w-lg text-center">
      <p className="text-xs uppercase tracking-wider text-sage">You’re booked</p>
      <h1 className="mt-2 font-display text-4xl">Booking confirmed</h1>
      <p className="mt-4 text-sm text-ink/70">
        Booking ID <strong>{row.id || "—"}</strong>
        <br />
        {row.therapist_name}
        <br />
        {row.label}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/dashboard">
          <Button>Dashboard</Button>
        </Link>
        {row.calendar_url ? (
          <a href={row.calendar_url} target="_blank" rel="noreferrer">
            <Button variant="outline">Add to Google Calendar</Button>
          </a>
        ) : (
          <Link to="/journey">
            <Button variant="outline">Journey</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
