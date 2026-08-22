import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Button, Card, Skeleton } from "../components/ui";

export default function ExerciseDetail() {
  const { id } = useParams();
  const [ex, setEx] = useState(null);

  useEffect(() => {
    api(`/api/v1/exercises/${id}`).then(setEx);
  }, [id]);

  if (!ex) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <p className="text-xs uppercase tracking-wider text-sage">{ex.body_part}</p>
        <h1 className="font-display text-4xl">{ex.name}</h1>
        <div className="mt-2 flex gap-2">
          <Badge>{ex.minutes} min</Badge>
          <Badge>{ex.level}</Badge>
        </div>
        <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-mist">
          <iframe
            title={ex.name}
            src={ex.video_url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Why it matters</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{ex.why}</p>
        <h3 className="mt-5 font-semibold">How</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {ex.steps?.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <Link to="/wellness/exercises">
          <Button variant="outline" className="mt-6">
            Back to exercises
          </Button>
        </Link>
      </Card>
    </div>
  );
}
