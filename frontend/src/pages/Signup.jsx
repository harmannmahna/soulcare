import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", language: "hinglish" });
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      await signup(form);
      nav("/consent");
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <Card>
        <h1 className="font-display text-4xl">Create a space</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
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
