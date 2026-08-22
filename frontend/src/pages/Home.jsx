import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Particles } from "../components/visuals";
import { Button, Card } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user, guest } = useAuth();
  const nav = useNavigate();
  const hero = useRef(null);

  useEffect(() => {
    if (!hero.current) return;
    gsap.fromTo(hero.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, ease: "power2.out" });
  }, []);

  async function startGuest() {
    if (!user) await guest("hinglish");
    nav("/details");
  }

  return (
    <div className="relative overflow-hidden">
      <Particles />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-6 md:grid-cols-2 md:pt-12">
        <motion.div ref={hero} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sage">Holistic · India-first · Safety-led</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            A companion that listens — and knows when to stop talking.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink/70">
            SoulCare merges mental support, daily habits, and crisis escalation. Every message is risk-classified
            before an AI replies. Red-tier language never reaches a model.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={startGuest}>Talk now (guest)</Button>
            <Link to="/therapists">
              <Button variant="outline">Find a therapist</Button>
            </Link>
            <Link to="/resources">
              <Button variant="ghost">Browse resources</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-moss/70">
            Three desks, one password <strong>Demo@123</strong> — pick a role on{" "}
            <Link className="text-sage underline" to="/login">
              Sign in
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {[
              ["User laptop", "demo@soulcare.app"],
              ["Therapist laptop", "therapist@soulcare.app"],
              ["B2B laptop", "b2b@soulcare.app"],
            ].map(([title, email]) => (
              <Link key={email} to="/login" className="rounded-2xl bg-foam px-3 py-2 ring-1 ring-white/5">
                <p className="font-semibold">{title}</p>
                <p className="truncate text-xs text-ink/50">{email}</p>
              </Link>
            ))}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.15 }}
          className="grid gap-4"
        >
          {[
            ["Green", "Calm companion reply. Gemini or offline MockAI."],
            ["Yellow", "Reply plus a specialist match from the live therapist directory."],
            ["Red", "Fixed safety script. 112 + Tele-MANAS 14416. Admin alert. No LLM."],
          ].map(([title, body], i) => (
            <Card key={title} className={i === 2 ? "border border-rose/20" : ""}>
              <p className="font-display text-2xl">{title}</p>
              <p className="mt-1 text-sm text-ink/70">{body}</p>
            </Card>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
