import { useCallback, useState } from "react";
import { api } from "../api/client";

export function useJourney() {
  const [board, setBoard] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [nudges, setNudges] = useState(null);

  const load = useCallback(async () => {
    const [b, c, w, n] = await Promise.all([
      api("/api/v1/journey/board"),
      api("/api/v1/journey/checkins"),
      api("/api/v1/journey/weekly"),
      api("/api/v1/nudges"),
    ]);
    setBoard(b);
    setCheckins(c);
    setWeekly(w);
    setNudges(n);
    return { board: b, checkins: c, weekly: w, nudges: n };
  }, []);

  async function addCheckin(payload) {
    const row = await api("/api/v1/journey/checkins", { method: "POST", body: payload });
    await load();
    return row;
  }

  return { board, checkins, weekly, nudges, load, addCheckin };
}

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [score, setScore] = useState(0);

  const load = useCallback(async (tab = "all") => {
    const [rows, s] = await Promise.all([
      api(`/api/v1/habits?tab=${tab}`),
      api("/api/v1/habits/score"),
    ]);
    setHabits(rows);
    setScore(s.score);
    return rows;
  }, []);

  async function create(payload) {
    await api("/api/v1/habits", { method: "POST", body: payload });
    return load();
  }

  async function complete(id, done = true) {
    await api(`/api/v1/habits/${id}/complete`, { method: "POST", body: { done } });
    return load();
  }

  return { habits, score, load, create, complete };
}
