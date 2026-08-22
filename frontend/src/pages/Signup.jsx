import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { homeFor } from "../lib/flow";

const ROLES = [
  { id: "user", label: "I’m a member", hint: "Chat, habits, booking" },
  { id: "therapist", label: "I’m a therapist", hint: "Partner desk · 15% fee" },
  { id: "b2b", label: "I’m a college / NGO", hint: "Aggregate B2B report" },
];

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", language: "hinglish", role: "user" });
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const user = await signup(form);
      nav(homeFor(user));
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <Card>
        <h1 className="font-display text-4xl">Create a space</h1>
        <p className="mt-2 text-sm text-ink/60">Pick a role first — it decides which dashboard you land on.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setForm({ ...form, role: r.id })}
                className={`rounded-2xl px-4 py-3 text-left text-sm ${
                  form.role === r.id ? "bg-moss text-foam" : "bg-sand text-ink"
                }`}
              >
                <strong>{r.label}</strong>
                <span className="mt-0.5 block text-xs opacity-80">{r.hint}</span>
              </button>
            ))}
          </div>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {err && <p className="text-sm text-rose">{err}</p>}
          <Button className="w-full">Sign up</Button>
        </form>
        <p className="mt-4 text-sm">
          Already here?{" "}
          <Link className="text-sage" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
