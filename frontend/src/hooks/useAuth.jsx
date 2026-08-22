import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api/client";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api("/api/v1/auth/me"));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    const data = await api("/api/v1/auth/login", { method: "POST", body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signup(payload) {
    const data = await api("/api/v1/auth/signup", { method: "POST", body: payload });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function guest(language = "en") {
    const data = await api("/api/v1/auth/guest", { method: "POST", body: { language } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function consent() {
    await api("/api/v1/auth/consent", { method: "POST", body: { accepted: true } });
    await refresh();
  }

  async function updateProfile(patch) {
    const next = await api("/api/v1/auth/me", { method: "PATCH", body: patch });
    setUser(next);
    return next;
  }

  async function upgrade(payload) {
    const data = await api("/api/v1/auth/upgrade", { method: "POST", body: payload });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, signup, guest, consent, updateProfile, upgrade, logout, refresh }),
    [user, loading],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
