export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SC";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function homeFor(user) {
  if (!user) return "/login";
  if (!user.details_completed) return "/details";
  return "/dashboard";
}

export function genderLabel(gender) {
  if (!gender) return "—";
  const map = { female: "Woman", male: "Man", "non-binary": "Non-binary", other: "Other" };
  return map[String(gender).toLowerCase()] || gender;
}
