import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { homeFor } from "../lib/flow";

export default function Login() {
  const { login, guest } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("demo@soulcare.app");
  const [password, setPassword] = useState("Demo@123");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const user = await login(email, password);
      nav(loc.state?.from || homeFor(user));
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <Card>
        <h1 className="font-display text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm text-ink/60">Sign in to SoulCare, or stay anonymous as a guest.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-sm text-rose">{err}</p>}
          <Button className="w-full">Sign in</Button>
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
