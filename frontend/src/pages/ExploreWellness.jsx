import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card } from "../components/ui";

const TILES = [
  {
    to: "/wellness/meditation",
    title: "Meditation",
    body: "A paced breathing practice with inhale, hold, and exhale counts.",
    icon: "🌬️",
  },
  {
    to: "/wellness/food",
    title: "Food gallery",
    body: "Log a meal or snap a photo for a calorie estimate.",
    icon: "🍽️",
  },
  {
    to: "/wellness/exercises",
    title: "Exercises",
    body: "Videos and why each movement matters for mood and body.",
    icon: "🧘",
  },
];

export default function ExploreWellness() {
  const [videos, setVideos] = useState([]);
  useEffect(() => {
    api("/api/v1/wellness/videos")
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Explore wellness</h1>
      <p className="mt-2 text-sm text-ink/60">Breath, food, and movement — small practices, not a programme.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full">
              <p className="text-3xl">{t.icon}</p>
              <p className="mt-3 font-display text-2xl">{t.title}</p>
              <p className="mt-1 text-sm text-ink/60">{t.body}</p>
            </Card>
          </Link>
        ))}
      </div>
      {videos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-2xl">Guided videos</h2>
          <p className="text-sm text-ink/55">Real YouTube embeds for breathing and movement.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {videos.slice(0, 4).map((v) => (
              <Card key={v.id}>
                <p className="font-semibold">{v.title}</p>
                <p className="mt-1 text-xs text-ink/55">{v.why}</p>
                <div className="mt-3 aspect-video overflow-hidden rounded-2xl bg-mist">
                  <iframe
                    title={v.title}
                    src={v.embed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
