const API = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("sc_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("sc_token", token);
  else localStorage.removeItem("sc_token");
}

export function getAdminToken() {
  return localStorage.getItem("sc_admin") || "soulcare-admin-demo";
}

export function setAdminToken(token) {
  localStorage.setItem("sc_admin", token);
}

export async function api(path, { method = "GET", body, admin = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (admin) headers["X-Admin-Token"] = getAdminToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail[0]?.msg : detail || res.statusText;
    throw new Error(message || "Request failed");
  }
  return data;
}

export async function apiForm(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail[0]?.msg : detail || res.statusText;
    throw new Error(message || "Request failed");
  }
  return data;
}

export function wsAdminUrl() {
  const token = getAdminToken();
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.replace(/^http/, "ws");
    return `${base}/ws/admin?token=${encodeURIComponent(token)}`;
  }
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/admin?token=${encodeURIComponent(token)}`;
}
