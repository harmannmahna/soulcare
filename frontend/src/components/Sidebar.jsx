import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { genderLabel, initials } from "../lib/flow";
import ProfileEditForm from "./ProfileEditForm";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/chat", label: "Talk now" },
  { to: "/therapists", label: "Find a therapist" },
  { to: "/help", label: "Help nearby" },
  { to: "/wellness", label: "Explore wellness" },
  { to: "/pharmacy", label: "Pharmacy" },
  { to: "/focus", label: "Focus time" },
  { to: "/phone-habit", label: "Phone habit" },
  { to: "/habits", label: "Habits" },
  { to: "/community", label: "Community" },
  { to: "/surveillance", label: "Campus insight" },
  { to: "/partner", label: "Join as partner" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar({ user }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const female = String(user?.gender || "").toLowerCase() === "female";

  return (
    <aside className="sticky top-0 hidden h-[calc(100vh-40px)] w-72 shrink-0 flex-col border-r border-moss/10 bg-foam/80 px-5 py-6 backdrop-blur md:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss text-sm font-semibold text-foam">
          {initials(user?.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl leading-tight">{user?.name || "Friend"}</p>
          <p className="truncate text-xs text-ink/50">{user?.email || "Guest space"}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-sand p-4 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-moss/70">Profile</p>
          <button
            type="button"
            className="rounded-full p-1 text-moss hover:bg-mist"
            aria-label="Edit profile"
            onClick={() => setEditing((v) => !v)}
          >
            ✎
          </button>
        </div>
        {editing ? (
          <ProfileEditForm compact onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[13px]">
            <dt className="text-ink/45">Gender</dt>
            <dd>{genderLabel(user?.gender)}</dd>
            <dt className="text-ink/45">Age</dt>
            <dd>{user?.age ?? "—"}</dd>
            <dt className="text-ink/45">Weight</dt>
            <dd>{user?.weight ? `${user.weight} kg` : "—"}</dd>
            <dt className="text-ink/45">Height</dt>
            <dd>{user?.height ? `${user.height} cm` : "—"}</dd>
          </dl>
        )}
      </div>

      <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto text-sm">
        {LINKS.filter((l) => l.to !== "/habits" || true)
          .concat(female ? [{ to: "/period", label: "Period tracker" }] : [])
          .map((l) => {
            const active = loc.pathname === l.to || loc.pathname.startsWith(`${l.to}/`);
            return (
              <button
                key={l.to}
                type="button"
                onClick={() => nav(l.to)}
                className={`block w-full rounded-xl px-3 py-2 text-left ${
                  active ? "bg-mist font-semibold text-ink" : "text-moss hover:bg-sand"
                }`}
              >
                {l.label}
              </button>
            );
          })}
      </nav>

      <button
        type="button"
        className="mt-4 rounded-full border border-moss/15 px-4 py-2 text-sm text-moss hover:bg-sand"
        onClick={() => {
          logout();
          nav("/login");
        }}
      >
        Log out
      </button>
    </aside>
  );
}
