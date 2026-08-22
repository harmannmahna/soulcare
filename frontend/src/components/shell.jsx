import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Badge } from "./ui";
import Sidebar from "./Sidebar";
import CheckInPopup from "./CheckInPopup";
import PhonePickupWatcher from "./PhonePickupWatcher";

const APP_LINKS = [
  { to: "/dashboard", label: "Home" },
  { to: "/chat", label: "Talk" },
  { to: "/habits", label: "Habits" },
  { to: "/community", label: "Circle" },
  { to: "/settings", label: "You" },
];

export function EmergencyStrip() {
  return (
    <div className="relative z-20 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 bg-moss px-4 py-2 text-center text-xs text-foam">
      <span className="opacity-80">If you are in crisis, reach a human now.</span>
      <a className="font-semibold underline decoration-foam/40" href="tel:112">
        Emergency 112
      </a>
      <a className="font-semibold underline decoration-foam/40" href="tel:14416">
        Tele-MANAS 14416
      </a>
    </div>
  );
}

export function RiskBanner({ tier = "green" }) {
  const copy = {
    green: { title: "Steady space", body: "Things sound manageable. We can talk about how you are feeling." },
    yellow: { title: "Care suggested", body: "This sounds heavier. A specialist match is available if you want company." },
    red: { title: "Safety first", body: "Crisis language detected. No AI reply — please call 112 or Tele-MANAS 14416." },
  }[tier] || { title: "Steady space", body: "" };
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        tier === "red" ? "bg-rose-50 text-rose-900" : tier === "yellow" ? "bg-amber-50 text-amber-950" : "bg-mist text-moss"
      }`}
    >
      <div className="flex items-center gap-2">
        <Badge tone={tier}>{tier}</Badge>
        <strong>{copy.title}</strong>
      </div>
      <p className="mt-1 opacity-80">{copy.body}</p>
    </div>
  );
}

function Wordmark() {
  return (
    <Link to="/" className="font-display text-xl tracking-tight">
      Soul<span className="text-sage">Care</span>
    </Link>
  );
}

export function PublicShell() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen bg-cream">
      <div className="grain" />
      <EmergencyStrip />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-sm text-moss md:flex">
          <NavLink to="/therapists">Therapists</NavLink>
          <NavLink to="/help">Help nearby</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
          {user ? (
            <NavLink to="/dashboard" className="rounded-full bg-moss px-4 py-1.5 text-foam">
              Dashboard
            </NavLink>
          ) : (
            <NavLink to="/login" className="rounded-full bg-moss px-4 py-1.5 text-foam">
              Sign in
            </NavLink>
          )}
        </nav>
      </header>
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const nav = useNavigate();
  return (
    <div className="relative min-h-screen bg-cream">
      <div className="grain" />
      <EmergencyStrip />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-40px)] max-w-[1400px]">
        <Sidebar user={user} onNavigate={(to) => nav(to)} />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-moss/10 bg-foam/95 px-2 py-2 text-[11px] text-moss backdrop-blur md:hidden">
        {APP_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-xl px-1 py-2 text-center ${isActive ? "bg-mist font-semibold text-ink" : ""}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <CheckInPopup />
      <PhonePickupWatcher />
    </div>
  );
}
