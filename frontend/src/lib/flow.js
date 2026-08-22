export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SC";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function roleOf(user) {
  return String(user?.role || "user").toLowerCase();
}

export function homeFor(user) {
  if (!user) return "/login";
  const role = roleOf(user);
  if (role === "therapist") return "/partner";
  if (role === "b2b") return "/b2b-demo";
  if (!user.details_completed) return "/details";
  return "/dashboard";
}

export function genderLabel(gender) {
  if (!gender) return "—";
  const map = { female: "Woman", male: "Man", "non-binary": "Non-binary", other: "Other" };
  return map[String(gender).toLowerCase()] || gender;
}

export const DEMO_ACCOUNTS = [
  {
    role: "user",
    title: "User",
    blurb: "Member dashboard — talk now, habits, pharmacy.",
    email: "demo@soulcare.app",
    password: "Demo@123",
    home: "/dashboard",
  },
  {
    role: "therapist",
    title: "Therapist",
    blurb: "Partner desk — 15% fee, slots, bookings, alerts.",
    email: "therapist@soulcare.app",
    password: "Demo@123",
    home: "/partner",
  },
  {
    role: "b2b",
    title: "B2B / college",
    blurb: "Institutional report — aggregates only, no names.",
    email: "b2b@soulcare.app",
    password: "Demo@123",
    home: "/b2b-demo",
  },
];
