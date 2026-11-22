"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { animate, motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Feed } from "@/lib/api";
import { BRAND } from "@/lib/brand";

const CityScene = dynamic(() => import("./CityScene"), { ssr: false, loading: () => <div className="h-full w-full bg-ink" /> });
const ease = [0.22, 1, 0.36, 1] as const;

type Stats = { live: number; businesses: number; deals: number; events: number; waitlist: number };

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: (v) => ref.current && (ref.current.textContent = Math.round(v).toLocaleString("en-IN")) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>0</span>;
}

function Hero({ stats, ticker }: { stats: Stats | null; ticker: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const words = BRAND.tagline.split(" ");
  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink text-cream">
      <motion.div style={{ scale }} className="absolute inset-0">
        <CityScene />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-transparent to-ink" />
      <motion.div style={{ opacity: fade }} className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-28 sm:justify-center sm:pb-0">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, ease }} className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
          <span className="live-dot" /> {stats ? `${stats.live} food trucks live in ${BRAND.city} right now` : `Live in ${BRAND.city}`}
        </motion.p>
        <h1 className="max-w-3xl font-display text-[clamp(3rem,10vw,7.5rem)] font-extrabold leading-[0.9] tracking-tight">
          {words.map((w, i) => (
            <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-2 align-bottom">
              <motion.span className={`inline-block ${i === words.length - 1 ? "bg-gradient-to-r from-saffron via-chili to-sun bg-clip-text text-transparent" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.5 + i * 0.12, ease }}>
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease }} className="mt-5 max-w-xl text-lg text-cream/75">
          {BRAND.pitch}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.8, ease }} className="pointer-events-auto mt-8 flex flex-wrap gap-3">
          <Link href="/pulse" className="rounded-2xl bg-gradient-to-r from-saffron to-chili px-6 py-3.5 font-semibold text-white shadow-[0_10px_40px_-10px_#ff7a1a] transition hover:scale-[1.03] active:scale-95">
            See what&apos;s on tonight →
          </Link>
          <a href="#business" className="rounded-2xl bg-white/10 px-6 py-3.5 font-semibold backdrop-blur transition hover:bg-white/20">
            List your business
          </a>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-8 hidden gap-5 text-xs text-cream/60 sm:flex">
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-saffron" /> Food trucks</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-chili" /> New openings</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-mint" /> Events</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-sky" /> Sports</span>
        </motion.div>
      </motion.div>
      {ticker.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-white/10 bg-ink/60 py-3 backdrop-blur">
          <div className="marquee flex w-max gap-10 whitespace-nowrap text-sm text-cream/80">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const pillars = [
  { emoji: "🚚", title: "Eat", color: "from-saffron to-chili", text: "See which food trucks are parked where tonight, what just opened, and the deals worth leaving home for." },
  { emoji: "🏏", title: "Play", color: "from-mint to-sky", text: "Book turfs and courts, then join open games when your group is two players short." },
  { emoji: "🏃", title: "Go", color: "from-sun to-saffron", text: "Run clubs, cycling loops, night rides and food fests. RSVP, show up and meet your city." },
];

function Pillars({ stats }: { stats: Stats | null }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} className="max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
        One app for everything happening on your <span className="text-saffron">nukkad</span>.
      </motion.h2>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {pillars.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 50, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, delay: i * 0.1, ease }}
            whileHover={{ y: -8 }}
            className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.3)]"
          >
            <div className={`mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${p.color} text-3xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>{p.emoji}</div>
            <h3 className="font-display text-3xl font-bold">{p.title}</h3>
            <p className="mt-2 text-ink/65">{p.text}</p>
          </motion.div>
        ))}
      </div>
      {stats && (
        <div className="mt-14 grid grid-cols-2 gap-6 border-t border-ink/10 pt-10 sm:grid-cols-4">
          {[
            [stats.businesses, "places listed"],
            [stats.live, "trucks live now"],
            [stats.deals, "active deals"],
            [stats.events, "upcoming events"],
          ].map(([n, l]) => (
            <div key={l as string}>
              <p className="font-display text-5xl font-extrabold tracking-tight"><Counter to={n as number} /></p>
              <p className="text-sm text-ink/55">{l}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const steps = [
  { when: "D-14", title: "Set up & shoot", text: "Free profile, pro photos and reels, a countdown page with a Notify me button." },
  { when: "D-7", title: "Build the buzz", text: "Teasers with local creators and an alert to everyone within 3–5 km." },
  { when: "D-3", title: "Reminders", text: "Everyone who tapped Notify me gets a nudge, plus early-bird coupons." },
  { when: "D-day", title: "Opening day", text: "First-100 coupons, live updates in the feed, check-in rewards and a pin on the city map." },
  { when: "D+7", title: "Reviews & repeats", text: "Verified reviews from real visitors and a second-visit coupon." },
  { when: "D+30", title: "Your results", text: "Footfall, coupons redeemed and cost per customer, in one report." },
];

function OpeningPack() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const h = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section id="business" className="bg-ink py-24 text-cream sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 md:grid-cols-[1fr_1.1fr]">
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-sm font-semibold uppercase tracking-widest text-saffron">For shops, cafés & food trucks</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">The Grand Opening Pack</h2>
          <p className="mt-4 max-w-md text-cream/70">Opening something new in {BRAND.city}? We run your launch from two weeks before to a month after, and show you exactly how many customers walked in.</p>
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <p className="text-sm text-cream/60">Pay only for results</p>
            <p className="mt-1 font-display text-4xl font-bold">₹5–20 <span className="text-lg font-medium text-cream/60">per customer who redeems</span></p>
            <p className="mt-2 text-sm text-cream/60">Free profile and live location for food trucks. Launch packs from ₹2,999.</p>
          </div>
        </div>
        <div ref={ref} className="relative pl-10">
          <div className="absolute left-3 top-2 h-full w-0.5 bg-white/10">
            <motion.div style={{ height: h }} className="w-full bg-gradient-to-b from-saffron to-chili" />
          </div>
          {steps.map((s, i) => (
            <motion.div key={s.when} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 0.7, delay: 0.05 * i, ease }} className="relative mb-12 last:mb-0">
              <span className="absolute -left-[34px] top-1 h-4 w-4 rounded-full border-4 border-ink bg-saffron" />
              <p className="font-mono text-sm font-bold text-saffron">{s.when}</p>
              <h3 className="mt-1 font-display text-2xl font-bold">{s.title}</h3>
              <p className="mt-1 text-cream/65">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const roles = [
  { id: "foodie", label: "🍜 Foodie" },
  { id: "player", label: "🏏 Player" },
  { id: "business", label: "🏪 Business" },
  { id: "venue", label: "🏟️ Venue" },
  { id: "organizer", label: "🎪 Organiser" },
] as const;

function Waitlist() {
  const [role, setRole] = useState<(typeof roles)[number]["id"]>("foodie");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
      <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
        Be first in {BRAND.city}.
      </motion.h2>
      <p className="mt-3 text-ink/60">Join the early list for launch-week deals, or to get your business on the map.</p>
      <div className="mx-auto mt-10 max-w-xl rounded-3xl bg-white p-6 text-left shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] sm:p-8">
        {done ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 text-center">
            <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className="text-6xl">🎉</motion.div>
            <p className="mt-4 font-display text-3xl font-bold">You&apos;re #{done} on the list</p>
            <p className="mt-1 text-ink/60">We&apos;ll WhatsApp you before launch.</p>
          </motion.div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setErr(null);
              try {
                const r = await api<{ position: number }>("/api/waitlist", { body: { phone, name: name || undefined, role }, auth: false });
                setDone(r.position);
              } catch (e) {
                setErr((e as ApiError).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="mb-2 text-sm font-semibold">I&apos;m a…</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button type="button" key={r.id} onClick={() => setRole(r.id)} className="relative rounded-full px-4 py-2 text-sm font-medium">
                  {role === r.id && <motion.span layoutId="role" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className={`relative ${role === r.id ? "text-cream" : "text-ink/70"}`}>{r.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="WhatsApp number" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
            </div>
            <button disabled={busy} className="btn-primary mt-4 w-full">{busy ? "Joining…" : "Join the list"}</button>
            {err && <p className="mt-3 text-sm font-medium text-chili">{err}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ticker, setTicker] = useState<string[]>([]);
  useEffect(() => {
    api<Stats>("/api/stats", { auth: false }).then(setStats).catch(() => {});
    api<Feed>("/api/feed?when=week", { auth: false })
      .then((f) =>
        setTicker([
          ...f.liveTrucks.map((b) => `${b.emoji} ${b.name} is live at ${b.live?.spot ?? b.area}`),
          ...f.comingSoon.map((b) => `${b.emoji} ${b.name} opens soon in ${b.area}`),
          ...f.events.map((e) => `${e.emoji} ${e.rsvpCount} going to ${e.title}`),
          ...f.deals.slice(0, 4).map((d) => `🎟️ ${d.title}${typeof d.business === "object" ? ` at ${d.business.name}` : ""}`),
        ])
      )
      .catch(() => {});
  }, []);
  return (
    <main>
      <Hero stats={stats} ticker={ticker} />
      <Pillars stats={stats} />
      <OpeningPack />
      <Waitlist />
      <footer className="border-t border-ink/10 py-10 text-center text-sm text-ink/50">
        {BRAND.name} · Made for {BRAND.city} and the cities like it
      </footer>
    </main>
  );
}
