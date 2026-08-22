import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { DEMO_ACCOUNTS, homeFor } from "../lib/flow";

export default function Login() {
  const { login, guest } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("demo@soulcare.app");
  const [password, setPassword] = useState("Demo@123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function go(user) {
    nav(loc.state?.from || homeFor(user));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy("form");
    try {
      const user = await login(email, password);
      await go(user);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy("");
    }
  }

  async function asRole(account) {
    setErr("");
    setEmail(account.email);
    setPassword(account.password);
    setBusy(account.role);
    try {
      const user = await login(account.email, account.password);
      nav(account.home || homeFor(user));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="font-display text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-ink/60">
        Three demo desks for three laptops. Same password <strong>Demo@123</strong>. Each role opens a different home.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {DEMO_ACCOUNTS.map((a) => (
          <Card key={a.role} className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-sage">{a.role}</p>
            <p className="font-display text-2xl">{a.title}</p>
            <p className="mt-1 flex-1 text-sm text-ink/60">{a.blurb}</p>
            <p className="mt-2 truncate text-[11px] text-ink/45">{a.email}</p>
            <Button className="mt-3 w-full" disabled={!!busy} onClick={() => asRole(a)}>
              {busy === a.role ? "…" : `Open ${a.title}`}
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="text-xs uppercase tracking-wider text-sage">Or type credentials</p>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-sm text-rose">{err}</p>}
          <Button className="w-full" disabled={!!busy}>
            {busy === "form" ? "…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button
            className="text-sage"
            onClick={async () => {
              await guest("hinglish");
              nav("/details");
            }}
          >
            Continue as guest
          </button>
          <Link className="text-sage" to="/signup">
            Create account
          </Link>
        </div>
      </Card>
    </div>
  );
}
