import { useCallback, useState } from "react";
import { api } from "../api/client";

export function useTherapists() {
  const [list, setList] = useState([]);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const rows = await api(`/api/v1/therapists${q ? `?${q}` : ""}`);
    setList(rows);
    return rows;
  }, []);

  const get = useCallback(async (id) => {
    const row = await api(`/api/v1/therapists/${id}`);
    setDetail(row);
    return row;
  }, []);

  return { list, detail, load, get };
}

export function useBooking() {
  const [booking, setBooking] = useState(null);

  async function create(payload) {
    const row = await api("/api/v1/bookings", { method: "POST", body: payload });
    setBooking(row);
    return row;
  }

  async function get(id) {
    const row = await api(`/api/v1/bookings/${id}`);
    setBooking(row);
    return row;
  }

  return { booking, create, get };
}
