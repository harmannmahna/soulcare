import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import ProfileEditForm from "../components/ProfileEditForm";

export default function Settings() {
  const { user, updateProfile, upgrade, logout } = useAuth();
  const [form, setForm] = useState({
    language: user?.language || "en",
    bedtime: user?.bedtime || "23:00",
    focus_hours: user?.focus_hours || "10:00-13:00",
  });
  const [up, setUp] = useState({ name: "", email: "", password: "" });
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink/55">Change personal information from the dashboard sidebar or here.</p>
        <div className="mt-4">
          <ProfileEditForm />
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Rhythm</h2>
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">Language / tone</span>
            <select
              className="mt-1 w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </label>
          <Input label="Bedtime" value={form.bedtime} onChange={(e) => setForm({ ...form, bedtime: e.target.value })} />
          <Input label="Focus hours" value={form.focus_hours} onChange={(e) => setForm({ ...form, focus_hours: e.target.value })} />
          <Button
            onClick={async () => {
              await updateProfile(form);
              setSaved(true);
            }}
          >
            Save rhythm
          </Button>
          {saved && <p className="text-sm text-sage">Saved.</p>}
        </div>
      </Card>
      {user?.guest && (
        <Card>
          <h2 className="font-display text-2xl">Upgrade guest</h2>
          <p className="text-sm text-ink/60">Keep this journey on a real account.</p>
          <div className="mt-3 space-y-3">
            <Input label="Name" value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} />
            <Input label="Email" value={up.email} onChange={(e) => setUp({ ...up, email: e.target.value })} />
            <Input label="Password" type="password" value={up.password} onChange={(e) => setUp({ ...up, password: e.target.value })} />
            <Button onClick={() => upgrade(up)}>Upgrade</Button>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-display text-2xl">More</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link className="text-sage" to="/phone-habit">
            Phone habit tracker
          </Link>
          <Link className="text-sage" to="/surveillance">
            Campus insight (B2B, static)
          </Link>
          <Link className="text-sage" to="/partner">
            Join as a therapist or chemist
          </Link>
        </div>
      </Card>
      <Button variant="ghost" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
