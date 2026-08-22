import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card, Input } from "../components/ui";

export default function Pharmacy() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [chain, setChain] = useState("all");
  const [sort, setSort] = useState("distance");
  const [coords, setCoords] = useState(null);
  const [geoNote, setGeoNote] = useState("Asking for location…");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoNote("Location is unavailable in this browser. Showing the list unsorted by distance.");
      setCoords(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoNote("Sorted by distance from your location.");
      },
      () => {
        setCoords(false);
        setGeoNote("Location permission off — list is not distance-sorted. Enable location to rank nearby stores.");
      },
      { timeout: 4000 },
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ sort });
    if (coords && coords.lat) {
      params.set("lat", coords.lat);
      params.set("lng", coords.lng);
    }
    if (q) params.set("q", q);
    api(`/api/v1/pharmacy?${params}`).then(setRows);
  }, [q, sort, coords]);

  const chains = useMemo(() => ["all", ...new Set(rows.map((r) => r.chain).filter(Boolean))], [rows]);
  const shown = rows.filter((r) => chain === "all" || r.chain === chain);

  return (
    <div>
      <h1 className="font-display text-4xl">Pharmacy finder</h1>
      <p className="mt-1 text-sm text-ink/55">
        Curated listings for Bengaluru, Mumbai, Delhi, Pune, and Hyderabad with real medicine names and MRP-style prices.
        Not a live crawl unless Firecrawl is configured.
      </p>
      <p className="mt-2 text-xs text-sage">{geoNote}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input placeholder="Search store or city…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={chain} onChange={(e) => setChain(e.target.value)}>
          {chains.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All stores" : c}
            </option>
          ))}
        </select>
        <select className="field" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="distance">Sort by distance</option>
          <option value="name">Sort by name</option>
        </select>
      </div>
      <div className="mt-5 grid gap-3">
        {shown.map((p) => (
          <Link key={p.id} to={`/pharmacy/${p.id}`}>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-display text-2xl">{p.name}</p>
                <p className="text-sm text-ink/60">
                  {p.area}, {p.city} · {p.open}
                </p>
                {p.chain && <Badge>{p.chain}</Badge>}
              </div>
              <p className="text-sm font-semibold text-sage">
                {p.distance_km != null ? `${p.distance_km} km` : "—"}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
