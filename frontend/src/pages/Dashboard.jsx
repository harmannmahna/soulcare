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

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const female = String(user?.gender || "").toLowerCase() === "female";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Your space</p>
        <h1 className="font-display text-4xl md:text-5xl">Hello, {user?.name || "friend"}</h1>
        <p className="mt-2 max-w-xl text-sm text-ink/60">
          Soft tools for mind and body. Nothing here replaces a human in a crisis — 112 and Tele-MANAS 14416 are always
          one tap away.
        </p>
        <button
          type="button"
          className="mt-3 text-sm text-sage underline decoration-sage/30 md:hidden"
          onClick={() => setEditOpen(true)}
        >
          Edit profile
        </button>
      </motion.div>

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
