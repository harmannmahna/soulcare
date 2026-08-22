import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell, PublicShell } from "./components/shell";
import { useAuth } from "./hooks/useAuth";
import { homeFor } from "./lib/flow";
import Home from "./pages/Home";
import Consent from "./pages/Consent";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Details from "./pages/Details";
import Chat from "./pages/Chat";
import Call from "./pages/Call";
import Therapists from "./pages/Therapists";
import TherapistDetail from "./pages/TherapistDetail";
import Booking from "./pages/Booking";
import BookingConfirm from "./pages/BookingConfirm";
import Resources from "./pages/Resources";
import ResourceDetail from "./pages/ResourceDetail";
import Help from "./pages/Help";
import Medicines from "./pages/Medicines";
import MedicineDetail from "./pages/MedicineDetail";
import Pharmacy from "./pages/Pharmacy";
import PharmacyDetail from "./pages/PharmacyDetail";
import Prescription from "./pages/Prescription";
import Journey from "./pages/Journey";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import Admin from "./pages/Admin";
import AdminSession from "./pages/AdminSession";
import Community from "./pages/Community";
import ExploreWellness from "./pages/ExploreWellness";
import Meditation from "./pages/Meditation";
import FoodGallery from "./pages/FoodGallery";
import Exercises from "./pages/Exercises";
import ExerciseDetail from "./pages/ExerciseDetail";
import FocusTime from "./pages/FocusTime";
import StartHabit from "./pages/StartHabit";
import PeriodTracker from "./pages/PeriodTracker";
import PhoneHabit from "./pages/PhoneHabit";
import Surveillance from "./pages/Surveillance";
import Partner from "./pages/Partner";
import B2BDemo from "./pages/B2BDemo";

function Gate({ children, needConsent = false, needDetails = false, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-sm text-moss">Settling in…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (needDetails && !user.details_completed) return <Navigate to="/details" replace />;
  if (needConsent && !user.consent) return <Navigate to="/consent" replace />;
  if (roles && !roles.includes(String(user.role || "user").toLowerCase())) {
    return <Navigate to={homeFor(user)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign-in" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/details" element={<Gate><Details /></Gate>} />
        <Route path="/faq" element={<FAQ />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/chat" element={<Gate needConsent needDetails><Chat /></Gate>} />
        <Route path="/call" element={<Gate needConsent needDetails><Call /></Gate>} />
        <Route path="/therapists" element={<Gate needDetails><Therapists /></Gate>} />
        <Route path="/therapists/:id" element={<Gate needDetails><TherapistDetail /></Gate>} />
        <Route path="/booking" element={<Gate needDetails><Booking /></Gate>} />
        <Route path="/booking/confirmation" element={<Gate needDetails><BookingConfirm /></Gate>} />
        <Route path="/resources" element={<Gate needDetails><Resources /></Gate>} />
        <Route path="/resources/:id" element={<Gate needDetails><ResourceDetail /></Gate>} />
        <Route path="/help" element={<Gate needDetails><Help /></Gate>} />
        <Route path="/medicines" element={<Gate needDetails><Medicines /></Gate>} />
        <Route path="/medicines/:id" element={<Gate needDetails><MedicineDetail /></Gate>} />
        <Route path="/pharmacy" element={<Gate needDetails><Pharmacy /></Gate>} />
        <Route path="/pharmacy/:id" element={<Gate needDetails><PharmacyDetail /></Gate>} />
        <Route path="/prescription-upload" element={<Gate needDetails><Prescription /></Gate>} />
        <Route path="/journey" element={<Gate needDetails><Journey /></Gate>} />
        <Route path="/dashboard" element={<Gate needDetails roles={["user"]}><Dashboard /></Gate>} />
        <Route path="/settings" element={<Gate needDetails><Settings /></Gate>} />
        <Route path="/community" element={<Gate needDetails><Community /></Gate>} />
        <Route path="/wellness" element={<Gate needDetails><ExploreWellness /></Gate>} />
        <Route path="/wellness/meditation" element={<Gate needDetails><Meditation /></Gate>} />
        <Route path="/wellness/food" element={<Gate needDetails><FoodGallery /></Gate>} />
        <Route path="/wellness/exercises" element={<Gate needDetails><Exercises /></Gate>} />
        <Route path="/wellness/exercises/:id" element={<Gate needDetails><ExerciseDetail /></Gate>} />
        <Route path="/focus" element={<Gate needDetails><FocusTime /></Gate>} />
        <Route path="/habits" element={<Gate needDetails><StartHabit /></Gate>} />
        <Route path="/period" element={<Gate needDetails><PeriodTracker /></Gate>} />
        <Route path="/phone-habit" element={<Gate needDetails><PhoneHabit /></Gate>} />
        <Route path="/surveillance" element={<Gate needDetails><Surveillance /></Gate>} />
        <Route path="/b2b-demo" element={<Gate needDetails roles={["b2b"]}><B2BDemo /></Gate>} />
        <Route path="/partner" element={<Gate needDetails roles={["therapist"]}><Partner /></Gate>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/sessions/:id" element={<AdminSession />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export { homeFor };
