import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { genderLabel, initials, roleOf } from "../lib/flow";
import ProfileEditForm from "./ProfileEditForm";

const NAV = [
  {
    heading: "Talk",
    items: [
      { to: "/dashboard", label: "Home", roles: ["user"] },
      { to: "/chat", label: "Talk now", roles: ["user"] },
      { to: "/talk-companion", label: "Voice companion", roles: ["user"] },
    ],
  },
  {
    heading: "Care",
    items: [
      { to: "/therapists", label: "Find a therapist", roles: ["user"] },
      { to: "/help", label: "Help nearby", roles: ["user"] },
      { to: "/pharmacy", label: "Pharmacy", roles: ["user"] },
    ],
  },
  {
    heading: "Daily",
    items: [
      { to: "/wellness", label: "Wellness", roles: ["user"] },
      { to: "/habits", label: "Habits", roles: ["user"] },
      { to: "/focus", label: "Focus time", roles: ["user"] },
      { to: "/phone-habit", label: "Phone habit", roles: ["user"] },
      { to: "/community", label: "Community", roles: ["user"] },
    ],
  },
  {
    heading: "More",
    items: [
      { to: "/admin", label: "Admin ops", roles: ["user", "b2b"] },
      { to: "/b2b-demo", label: "B2B reports", roles: ["b2b"] },
      { to: "/surveillance", label: "Campus insight", roles: ["b2b"] },
      { to: "/partner", label: "Partner desk", roles: ["therapist"] },
      { to: "/settings", label: "Settings", roles: ["user", "therapist", "b2b"] },
    ],
  },
];

export default function Sidebar({ user }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const female = String(user?.gender || "").toLowerCase() === "female";
  const role = roleOf(user);
  const extra = female && role === "user" ? [{ to: "/period", label: "Period tracker" }] : [];
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((l) => !l.roles || l.roles.includes(role)).concat(g.heading === "Daily" ? extra : []),
  })).filter((g) => g.items.length);

  return (
    <aside className="sticky top-0 hidden h-[calc(100vh-40px)] w-72 shrink-0 flex-col border-r border-white/5 bg-foam/80 px-5 py-6 backdrop-blur md:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss text-sm font-semibold text-sand">
          {initials(user?.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold leading-tight">{user?.name || "Friend"}</p>
          <p className="truncate text-xs text-ink/50">{user?.email || "Guest space"}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-sand p-4 text-sm ring-1 ring-white/5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-sage/80">Profile</p>
          <button
            type="button"
            className="rounded-full p-1 text-sage hover:bg-mist"
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

      <nav className="mt-5 flex-1 space-y-4 overflow-y-auto text-sm">
        {groups.map((g) => (
          <div key={g.heading}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">{g.heading}</p>
            <div className="space-y-0.5">
              {g.items.map((l) => {
                const active = loc.pathname === l.to || loc.pathname.startsWith(`${l.to}/`);
                return (
                  <button
                    key={l.to}
                    type="button"
                    onClick={() => nav(l.to)}
                    className={`block w-full rounded-full px-3 py-2 text-left transition ${
                      active ? "bg-moss font-semibold text-sand" : "text-ink/70 hover:bg-mist hover:text-ink"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-ink/80 hover:bg-mist"
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
