import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell, PublicShell } from "./components/shell";
import { useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import Consent from "./pages/Consent";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

function Gate({ children, needConsent = false }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-sm text-moss">Settling in…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (needConsent && !user.consent) return <Navigate to="/consent" replace />;
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
        <Route path="/faq" element={<FAQ />} />
        <Route path="/help" element={<Help />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/chat" element={<Gate needConsent><Chat /></Gate>} />
        <Route path="/call" element={<Gate needConsent><Call /></Gate>} />
        <Route path="/therapists" element={<Therapists />} />
        <Route path="/therapists/:id" element={<TherapistDetail />} />
        <Route path="/booking" element={<Gate><Booking /></Gate>} />
        <Route path="/booking/confirmation" element={<Gate><BookingConfirm /></Gate>} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/medicines" element={<Medicines />} />
        <Route path="/medicines/:id" element={<MedicineDetail />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/pharmacy/:id" element={<PharmacyDetail />} />
        <Route path="/prescription-upload" element={<Gate><Prescription /></Gate>} />
        <Route path="/journey" element={<Gate><Journey /></Gate>} />
        <Route path="/dashboard" element={<Gate><Dashboard /></Gate>} />
        <Route path="/settings" element={<Gate><Settings /></Gate>} />
        <Route path="/community" element={<Community />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/sessions/:id" element={<AdminSession />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
