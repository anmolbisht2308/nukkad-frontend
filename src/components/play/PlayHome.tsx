"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { whenIST } from "@/lib/format";
import { gradient, SPORT_META, type Game, type Sport, type VenueCard } from "@/lib/play";
import { rupees } from "@/lib/pay";
import { useAuth } from "../Auth";
import { toast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;
const FILTERS: (Sport | "all")[] = ["all", "cricket", "football", "pickleball", "badminton"];
const steps = [
  { n: "1", t: "Pick a venue", e: "📍" },
  { n: "2", t: "Tap a free slot", e: "🕖" },
  { n: "3", t: "Pay & play", e: "⚡" },
];

function VenueTile({ v, i }: { v: VenueCard; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-5%" }} transition={{ duration: 0.7, delay: i * 0.08, ease }}>
      <Link href={`/play/${v.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)] transition hover:-translate-y-1.5">
        <div className="relative grid h-40 place-items-center overflow-hidden" style={gradient(v.theme)}>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 transition-transform duration-700 group-hover:scale-150" />
          <div className="absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-black/10" />
          {/* court lines */}
          <div className="absolute inset-6 rounded-xl border-2 border-white/25" />
          <div className="absolute inset-y-6 left-1/2 w-0.5 bg-white/25" />
          <span className="relative text-6xl drop-shadow-lg transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-125">{v.emoji}</span>
          <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">from {rupees(v.fromPrice)}/hr</span>
        </div>
        <div className="p-5">
          <p className="font-display text-xl font-bold leading-tight">{v.name}</p>
          <p className="text-sm text-ink/60">📍 {v.area} · ★ {v.rating.avg.toFixed(1)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {v.sports.map((s) => (
              <span key={s} className="chip">{SPORT_META[s].emoji} {SPORT_META[s].label}</span>
            ))}
            <span className="chip">{v.courts.length} {v.courts.length === 1 ? "court" : "courts"}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function GameRow({ g, i, onChange }: { g: Game; i: number; onChange: () => void }) {
  const { withLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  const join = () =>
    withLogin(async () => {
      setBusy(true);
      try {
        await api(`/api/play/games/${g._id}/join`, { method: "POST" });
        toast.success("You're in the game!", { emoji: "🙌", description: "The host has been notified. Pay your share at the venue.", celebrate: true });
        onChange();
      } catch (e) {
        toast.error(e);
      } finally {
        setBusy(false);
      }
    });
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.06, ease }} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl" style={gradient(g.business.theme)}>
        {SPORT_META[g.sport].emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-saffron-deep">{whenIST(g.startsAt)}</p>
        <p className="font-display text-lg font-bold leading-tight">
          {SPORT_META[g.sport].label} at {g.business.name}
        </p>
        <p className="truncate text-sm text-ink/60">
          {g.court.name} · {g.skill === "any" ? "All levels" : g.skill} · {g.pricePerHead ? `${rupees(g.pricePerHead)}/head` : "Free"} · by {g.host.name ?? "a player"}
        </p>
        {g.note && <p className="truncate text-xs italic text-ink/60">“{g.note}”</p>}
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: g.spots }, (_, k) => (
            <motion.span key={k} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + k * 0.04, type: "spring" }} className={`h-2.5 w-2.5 rounded-full ${k < g.playerCount ? "bg-mint" : "bg-ink/10"}`} />
          ))}
          <span className="ml-1 text-xs text-ink/60">{g.spotsLeft ? `${g.spotsLeft} spot${g.spotsLeft > 1 ? "s" : ""} left` : "Full"}</span>
        </div>
      </div>
      {g.isHost ? (
        <span className="shrink-0 rounded-2xl bg-ink/5 px-3 py-2 text-xs font-semibold">Your game</span>
      ) : (
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={busy || (!g.joined && g.spotsLeft === 0)}
          onClick={join}
          className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${g.joined ? "bg-mint text-ink" : "bg-ink text-cream"}`}
        >
          {g.joined ? "Joined ✓" : g.spotsLeft ? "Join" : "Full"}
        </motion.button>
      )}
    </motion.div>
  );
}

export default function PlayHome() {
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport | "all">("all");
  const [venues, setVenues] = useState<{ key: string; items: VenueCard[] } | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const q = sport === "all" ? "" : `?sport=${sport}`;
    api<{ items: VenueCard[] }>(`/api/play/venues${q}`, { auth: false })
      .then((r) => setVenues({ key: sport, items: r.items }))
      .catch(() => setVenues({ key: sport, items: [] }));
  }, [sport]);

  useEffect(() => {
    const q = sport === "all" ? "" : `?sport=${sport}`;
    api<{ items: Game[] }>(`/api/play/games${q}`)
      .then((r) => setGames(r.items))
      .catch(() => setGames([]));
  }, [sport, tick, user]);

  const list = venues?.key === sport ? venues.items : null;

  return (
    <main className="pb-28">
      <section className="relative overflow-hidden bg-ink px-5 pb-16 pt-32 text-cream">
        <motion.div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-mint/20 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 7, repeat: Infinity }} />
        <motion.div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-sky/20 blur-3xl" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="relative mx-auto max-w-6xl">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold uppercase tracking-widest text-mint">
            Play in Bareilly
          </motion.p>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.6rem,8vw,6rem)] font-extrabold leading-[0.92] tracking-tight">
            {["Book", "a", "turf", "in", "3", "taps."].map((w, i) => (
              <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-2 align-bottom">
                <motion.span className={`inline-block ${w === "3" ? "text-mint" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease }}>
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            {steps.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.12, ease }} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-mint font-bold text-ink">{s.n}</span>
                <span className="font-medium">{s.t}</span>
                <span>{s.e}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setSport(f)} className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold">
              {sport === f && <motion.span layoutId="sport-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={`relative ${sport === f ? "text-cream" : "text-ink/60"}`}>{f === "all" ? "🏟️ All" : `${SPORT_META[f].emoji} ${SPORT_META[f].label}`}</span>
            </button>
          ))}
        </div>

        <h2 className="mt-10 font-display text-3xl font-extrabold tracking-tight">Venues</h2>
        <AnimatePresence mode="wait">
          <motion.div key={sport} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {!list && [0, 1, 2].map((k) => <div key={k} className="h-64 skeleton rounded-3xl" />)}
            {list?.map((v, i) => <VenueTile key={v._id} v={v} i={i} />)}
            {list?.length === 0 && <p className="text-ink/60">No venues for this sport yet.</p>}
          </motion.div>
        </AnimatePresence>

        <div className="mt-14 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">🙋 Open games</h2>
            <p className="text-sm text-ink/60">Short of players? Join a game someone already booked.</p>
          </div>
          <Link href="/bookings" className="hidden text-sm font-semibold underline underline-offset-4 sm:block">Host one →</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {!games && [0, 1].map((k) => <div key={k} className="h-28 skeleton rounded-3xl" />)}
          {games?.map((g, i) => <GameRow key={g._id} g={g} i={i} onChange={() => setTick((t) => t + 1)} />)}
          {games?.length === 0 && <p className="text-ink/60">No open games right now. Book a slot and host one!</p>}
        </div>
      </div>
    </main>
  );
}
