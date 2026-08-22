import { useCallback, useEffect, useState } from "react";
import { api, wsAdminUrl } from "../api/client";

export function useAdmin() {
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [agentActions, setAgentActions] = useState([]);

  const load = useCallback(async () => {
    const [s, e, a] = await Promise.all([
      api("/api/v1/admin/sessions", { admin: true }),
      api("/api/v1/admin/events", { admin: true }),
      api("/api/v1/admin/agent-actions", { admin: true }).catch(() => []),
    ]);
    setSessions(s);
    setEvents(e);
    setAgentActions(a);
  }, []);

  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(wsAdminUrl());
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          setAlerts((a) => [data, ...a].slice(0, 20));
          load();
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* demo still works without live socket */
    }
    return () => ws && ws.close();
  }, [load]);

  async function takeover(id) {
    return api(`/api/v1/admin/sessions/${id}/takeover`, { method: "POST", admin: true });
  }

  async function session(id) {
    return api(`/api/v1/admin/sessions/${id}`, { admin: true });
  }

  return { sessions, events, alerts, agentActions, load, takeover, session };
}

export function useCatalog() {
  const loadMedicines = () => api("/api/v1/medicines");
  const loadMedicine = (id) => api(`/api/v1/medicines/${id}`);
  const loadPharmacies = () => api("/api/v1/pharmacy");
  const loadPharmacy = (id) => api(`/api/v1/pharmacy/${id}`);
  const uploadRx = (body) => api("/api/v1/prescriptions", { method: "POST", body });
  const getRx = (id) => api(`/api/v1/prescriptions/${id}`);
  return { loadMedicines, loadMedicine, loadPharmacies, loadPharmacy, uploadRx, getRx };
}

export function usePages() {
  const [routes, setRoutes] = useState([]);
  const load = useCallback(async () => {
    const data = await api("/api/v1/pages");
    setRoutes(data.routes || []);
    return data.routes || [];
  }, []);
  return { routes, load };
}
