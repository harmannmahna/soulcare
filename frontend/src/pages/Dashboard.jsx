import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { Modal } from "../components/ui";
import ProfileEditForm from "../components/ProfileEditForm";
import TalkNowCard from "../components/dashboard/TalkNowCard";
import TalkCompanionCard from "../components/dashboard/TalkCompanionCard";
import FindTherapistCard from "../components/dashboard/FindTherapistCard";
import FindHelpNearbyCard from "../components/dashboard/FindHelpNearbyCard";
import ExploreWellnessCard from "../components/dashboard/ExploreWellnessCard";
import PharmacyFinderCard from "../components/dashboard/PharmacyFinderCard";
import FocusTimeCard from "../components/dashboard/FocusTimeCard";
import StartHabitCard from "../components/dashboard/StartHabitCard";
import PeriodTrackerCard from "../components/dashboard/PeriodTrackerCard";
import CommunityCard from "../components/dashboard/CommunityCard";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SproutIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-16 w-16 text-sage" fill="none" aria-hidden>
      <path
        d="M24 42V22"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24 24c-1.5-8 4-14 12-15 1 8-3 14-12 15Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M24 27c1.2-6-3.5-11-10-12-1 6.5 2.8 11.5 10 12Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const female = String(user?.gender || "").toLowerCase() === "female";
  const first = (user?.name || "friend").split(" ")[0];

  const pills = [
    { label: "I'm feeling stressed", to: "/chat" },
    { label: "Need a quiet moment", to: "/wellness/meditation" },
    { label: "Talk out loud", to: "/talk-companion" },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sage">Your space</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            {greeting()}, {first}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink/60">
            Talk, rest, or find a person. If you are in crisis, 112 and Tele-MANAS 14416 sit at the top of every page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {pills.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => nav(p.to)}
                className="rounded-full border border-sage/35 bg-leaf/20 px-4 py-2 text-sm text-sage transition hover:bg-moss hover:text-sand"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-sm text-sage underline decoration-sage/30 md:hidden"
            onClick={() => setEditOpen(true)}
          >
            Edit profile
          </button>
        </div>

        <button
          type="button"
          onClick={() => nav("/talk-companion")}
          className="flex min-h-[180px] flex-col justify-between rounded-3xl bg-foam p-6 text-left shadow-soft ring-1 ring-white/5 transition hover:ring-sage/35"
        >
          <SproutIcon />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sage">AI Companion</p>
            <p className="mt-1 font-display text-2xl font-semibold">Ready to listen and guide.</p>
            <p className="mt-1 text-sm text-ink/55">Tap to talk out loud — or type if that’s easier.</p>
          </div>
        </button>
      </motion.div>

      <button
        type="button"
        onClick={() => nav("/wellness")}
        className="relative block w-full overflow-hidden rounded-3xl bg-foam p-6 text-left ring-1 ring-white/5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(24,126,82,0.35),transparent_45%)]" />
        <div className="relative max-w-lg">
          <p className="text-xs uppercase tracking-[0.18em] text-sage">Nature moment</p>
          <p className="mt-2 font-display text-3xl font-semibold">Step into the wellness hub</p>
          <p className="mt-2 text-sm text-ink/60">Breathing, food, and movement — a quieter room when the day is loud.</p>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TalkNowCard onClick={() => nav("/chat")} />
        <TalkCompanionCard onClick={() => nav("/talk-companion")} />
        <FindTherapistCard onClick={() => nav("/therapists")} />
        <FindHelpNearbyCard onClick={() => nav("/help")} />
        <ExploreWellnessCard onClick={() => nav("/wellness")} />
        <PharmacyFinderCard onClick={() => nav("/pharmacy")} />
        <FocusTimeCard onClick={() => nav("/focus")} />
        <StartHabitCard onClick={() => nav("/habits")} />
        {female && <PeriodTrackerCard onClick={() => nav("/period")} />}
        <CommunityCard onClick={() => nav("/community")} />
      </div>

      <Modal open={editOpen} title="Edit profile" onClose={() => setEditOpen(false)}>
        <ProfileEditForm onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
