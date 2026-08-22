import { useEffect, useRef, useState } from "react";
import { api, getToken } from "../api/client";

export default function PhonePickupWatcher() {
  const [note, setNote] = useState(null);
  const last = useRef(0);

  useEffect(() => {
    if (!getToken()) return undefined;

    async function ping(source) {
      const now = Date.now();
      if (now - last.current < 20_000) return;
      last.current = now;
      try {
        const data = await api("/api/v1/phone/pickup", { method: "POST", body: { source } });
        setNote(`Looks like you picked up your phone. That's pickup #${data.today} today.`);
        setTimeout(() => setNote(null), 6000);
      } catch {
        setNote("You picked up your phone — maybe a breath before the next scroll?");
        setTimeout(() => setNote(null), 6000);
      }
    }

    function onVis() {
      if (document.visibilityState === "visible") ping("visibility");
    }
    function onFocus() {
      ping("focus");
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!note) return null;
  return (
    <div className="fixed left-4 top-16 z-40 max-w-sm rounded-2xl bg-moss px-4 py-3 text-sm text-foam shadow-soft md:left-auto md:right-4">
      <p>{note}</p>
    </div>
  );
}
