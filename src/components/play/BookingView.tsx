"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { mapsLink } from "@/lib/format";
import { pay, rupees } from "@/lib/pay";
import {
  dateChip,
  gradient,
  hourLabel,
  longDate,
  nextDays,
  rangeLabel,
  SPORT_META,
  whatsappShare,
  type Availability,
  type BookingResponse,
  type Court,
  type Venue,
} from "@/lib/play";
import { useAuth } from "../Auth";

const ease = [0.22, 1, 0.36, 1] as const;
type Phase = "idle" | "creating" | "paying" | "done";

function Burst() {
  const bits = ["🎉", "⚡", "🏆", "✨", "🔥", "🙌", "🎊", "💥"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const d = 120 + (i % 4) * 40;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/3 text-2xl"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 60, scale: 1.2, opacity: 0, rotate: (i % 2 ? 1 : -1) * 180 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: (i % 5) * 0.03 }}
          >
            {bits[i % bits.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

export default function BookingView({ venue, courts }: { venue: Venue; courts: Court[] }) {
  const { user, withLogin } = useAuth();
  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]);
  const [courtId, setCourtId] = useState(courts[0]?._id ?? "");
  const [sel, setSel] = useState<{ key: string; start: number; hours: number } | null>(null);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [payMode, setPayMode] = useState<"online" | "venue">("online");
  const [friends, setFriends] = useState<{ name: string; phone: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; share: number; label: string } | null>(null);

  useEffect(() => {
    let alive = true;
    api<Availability>(`/api/play/venues/${venue.slug}/availability?date=${date}`, { auth: false })
      .then((a) => alive && setAvail(a))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [venue.slug, date, refresh]);

  const key = `${date}:${courtId}`;
  const selection = sel?.key === key ? sel : null; // selection resets when date/court changes
  const view = avail?.date === date ? avail : null;
  const court = courts.find((c) => c._id === courtId);
  const slots = view?.courts.find((c) => c._id === courtId)?.slots ?? [];

  const freeRun = (start: number) => {
    let n = 0;
    while (n < 4 && slots.find((s) => s.hour === start + n)?.status === "free") n++;
    return n;
  };
  const maxHours = selection ? freeRun(selection.start) : 0;
  const amount = selection ? slots.filter((s) => s.hour >= selection.start && s.hour < selection.start + selection.hours).reduce((a, s) => a + s.price, 0) : 0;
  const people = 1 + friends.filter((f) => f.name.trim()).length;
  const share = Math.ceil(amount / people);

  const tap = (hour: number) => {
    setErr(null);
    if (selection && hour >= selection.start && hour < selection.start + selection.hours) {
      setSel(null);
      return;
    }
    // tapping the slot right after the selection extends it
    if (selection && hour === selection.start + selection.hours && selection.hours < freeRun(selection.start)) {
      setSel({ ...selection, hours: selection.hours + 1 });
      return;
    }
    setSel({ key, start: hour, hours: 1 });
  };

  const book = () =>
    withLogin(async () => {
      if (!selection || !court) return;
      setErr(null);
      setPhase("creating");
      try {
        const split = friends.filter((f) => f.name.trim()).map((f) => ({ name: f.name.trim(), phone: f.phone.trim() || undefined }));
        const r = await api<BookingResponse>("/api/play/bookings", {
          body: { courtId, date, startHour: selection.start, hours: selection.hours, payMode, split },
        });
        if (r.order) {
          setPhase("paying");
          const proof = await pay(r.order, { name: venue.name, description: `${court.name} · ${longDate(date)} ${rangeLabel(selection.start, selection.hours)}` });
          await api(`/api/play/bookings/${r.booking._id}/confirm`, { body: { proof } });
        }
        setDone({ amount: r.booking.amount, share: r.booking.participants[0]?.share ?? r.booking.amount, label: `${court.name} · ${longDate(date)}, ${rangeLabel(selection.start, selection.hours)}` });
        setPhase("done");
        setSel(null);
        setFriends([]);
        setRefresh((x) => x + 1);
      } catch (e) {
        setErr((e as ApiError).message);
        setPhase("idle");
        setRefresh((x) => x + 1);
      }
    });

  return (
    <main className="pb-72">
      {/* hero */}
      <section className="relative overflow-hidden pb-14 pt-28 text-white" style={gradient(venue.theme)}>
        <motion.div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="absolute inset-x-10 bottom-6 top-24 hidden rounded-3xl border-2 border-white/10 sm:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 sm:flex-row sm:items-end sm:gap-6">
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] text-3xl sm:h-24 sm:w-24 sm:rounded-[2rem] sm:text-5xl bg-white/20 ring-1 ring-white/30 backdrop-blur sm:h-32 sm:w-32 sm:text-6xl">
            {venue.emoji}
          </motion.div>
          <div>
            <motion.h1 style={{ ["--d" as string]: "0.05s" }} className="hero-in font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
              {venue.name}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-2 text-white/85">
              {venue.tagline}
            </motion.p>
            <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1">📍 {venue.area}</span>
              <span className="rounded-full bg-white/20 px-3 py-1">★ {venue.rating.avg.toFixed(1)}</span>
              {venue.hours && <span className="rounded-full bg-white/20 px-3 py-1">🕒 {venue.hours}</span>}
              <a href={mapsLink(venue.location.coordinates)} target="_blank" rel="noreferrer" className="rounded-full bg-white/20 px-3 py-1 underline-offset-2 hover:underline">
                Directions ↗
              </a>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        {/* date strip */}
        <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
          {days.map((d) => {
            const c = dateChip(d);
            const on = d === date;
            return (
              <button key={d} onClick={() => setDate(d)} className="relative flex w-16 shrink-0 flex-col items-center rounded-2xl py-2.5">
                {on && <motion.span layoutId="date-pill" className="absolute inset-0 rounded-2xl bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                {!on && <span className="absolute inset-0 rounded-2xl bg-white" />}
                <span className={`relative text-xs font-medium ${on ? "text-cream/70" : "text-ink/60"}`}>{c.top}</span>
                <span className={`relative font-display text-2xl font-bold ${on ? "text-cream" : ""}`}>{c.bottom}</span>
              </button>
            );
          })}
        </div>

        {/* court tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {courts.map((c) => (
            <button key={c._id} onClick={() => setCourtId(c._id)} className="relative rounded-full px-4 py-2 text-sm font-semibold">
              {courtId === c._id && <motion.span layoutId="court-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-saffron to-chili" />}
              <span className={`relative ${courtId === c._id ? "text-white" : "text-ink/60"}`}>
                {SPORT_META[c.sport].emoji} {c.name}
              </span>
            </button>
          ))}
        </div>
        {court && (
          <p className="mt-3 text-sm text-ink/60">
            {rupees(court.pricePerHour)}/hr · <span className="font-semibold text-saffron">🔥 peak {rupees(court.peakPricePerHour)}/hr</span> ({hourLabel(court.peakFrom)}–{hourLabel(court.peakTo)}) · tap a slot, tap the next one to add an hour
          </p>
        )}

        {/* slot grid */}
        <AnimatePresence mode="wait">
          <motion.div key={key + (view ? "-ok" : "-load")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {!view && Array.from({ length: 12 }, (_, i) => <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-ink/5" />)}
            {view &&
              slots.map((s, i) => {
                const picked = !!selection && s.hour >= selection.start && s.hour < selection.start + selection.hours;
                const free = s.status === "free";
                return (
                  <motion.button
                    key={s.hour}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: picked ? 1.04 : 1 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 18) * 0.02, ease }}
                    whileTap={free ? { scale: 0.92 } : undefined}
                    disabled={!free}
                    onClick={() => tap(s.hour)}
                    className={`relative overflow-hidden rounded-2xl px-2 py-3 text-left transition-colors ${
                      picked ? "bg-ink text-cream shadow-lg" : free ? "bg-white hover:bg-mint/15" : "bg-ink/5 text-ink/30"
                    }`}
                  >
                    {picked && <motion.span layoutId="slot-glow" className="absolute inset-0 rounded-2xl ring-2 ring-mint" />}
                    <span className="relative block font-display text-lg font-bold">{hourLabel(s.hour)}</span>
                    <span className="relative block text-xs">
                      {s.status === "booked" ? "Booked" : s.status === "past" ? "—" : rupees(s.price)}
                      {s.peak && free && <span className={`ml-1 ${picked ? "text-sun" : "text-saffron"}`}>🔥</span>}
                    </span>
                  </motion.button>
                );
              })}
          </motion.div>
        </AnimatePresence>
        {view && slots.length > 0 && slots.every((s) => s.status !== "free") && <p className="mt-4 text-ink/60">Fully booked on {longDate(date)}. Try another day or court.</p>}
      </div>

      {/* sticky summary */}
      <AnimatePresence>
        {selection && court && phase !== "done" && (
          <motion.div initial={{ y: "110%" }} animate={{ y: 0 }} exit={{ y: "110%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:pb-5">
            <div className="mx-auto max-w-3xl rounded-3xl bg-ink p-5 text-cream shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-cream/60">{court.name} · {longDate(date)}</p>
                  <p className="font-display text-2xl font-bold">{rangeLabel(selection.start, selection.hours)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1">
                  <button onClick={() => setSel({ ...selection, hours: Math.max(1, selection.hours - 1) })} className="h-9 w-9 rounded-xl text-lg hover:bg-white/10" aria-label="Fewer hours">−</button>
                  <span className="w-12 text-center text-sm font-semibold">{selection.hours} hr</span>
                  <button disabled={selection.hours >= maxHours} onClick={() => setSel({ ...selection, hours: selection.hours + 1 })} className="h-9 w-9 rounded-xl text-lg hover:bg-white/10 disabled:opacity-30" aria-label="More hours">+</button>
                </div>
                <motion.p key={amount} initial={{ scale: 1.2, color: "#2EE6A6" }} animate={{ scale: 1, color: "#FFF7EC" }} className="font-display text-3xl font-extrabold">
                  {rupees(amount)}
                </motion.p>
              </div>

              {/* split */}
              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream/70">Split with friends {people > 1 && <b className="text-mint">· {rupees(share)} each</b>}</span>
                  <button onClick={() => setFriends((f) => [...f, { name: "", phone: "" }])} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">+ Add friend</button>
                </div>
                <AnimatePresence initial={false}>
                  {friends.map((f, i) => (
                    <motion.div key={i} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 flex gap-2">
                        <input value={f.name} onChange={(e) => setFriends((all) => all.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-cream/40 focus:ring-2 focus:ring-mint" />
                        <input value={f.phone} inputMode="numeric" onChange={(e) => setFriends((all) => all.map((x, k) => (k === i ? { ...x, phone: e.target.value } : x)))} placeholder="Phone (optional)" className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-cream/40 focus:ring-2 focus:ring-mint" />
                        <button onClick={() => setFriends((all) => all.filter((_, k) => k !== i))} className="rounded-xl px-2 text-cream/50 hover:text-cream" aria-label="Remove friend">✕</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex rounded-2xl bg-white/10 p-1 text-sm font-semibold">
                  {(["online", "venue"] as const).map((m) => (
                    <button key={m} onClick={() => setPayMode(m)} className="relative rounded-xl px-3 py-2">
                      {payMode === m && <motion.span layoutId="paymode" className="absolute inset-0 rounded-xl bg-cream" />}
                      <span className={`relative ${payMode === m ? "text-ink" : "text-cream/70"}`}>{m === "online" ? "⚡ Pay now (UPI)" : "🏟️ Pay at venue"}</span>
                    </button>
                  ))}
                </div>
                <motion.button whileTap={{ scale: 0.97 }} disabled={phase !== "idle"} onClick={book} className="ml-auto min-w-40 flex-1 rounded-2xl bg-gradient-to-r from-saffron to-chili px-5 py-3.5 font-semibold text-white disabled:opacity-70 sm:flex-none">
                  {phase === "creating" ? "Holding your slot…" : phase === "paying" ? "Processing payment…" : payMode === "online" ? `Pay ${rupees(amount)}` : "Reserve slot"}
                </motion.button>
              </div>
              {people > 1 && <p className="mt-2 text-xs text-cream/60">You pay the venue; {people - 1} friend{people > 2 ? "s" : ""} pay you back {rupees(share)} each. We&apos;ll track who has paid.</p>}
              {!user && <p className="mt-2 text-xs text-cream/50">You&apos;ll log in with your phone number first.</p>}
              {err && <p className="mt-2 text-sm font-medium text-chili">{err}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* success */}
      <AnimatePresence>
        {phase === "done" && done && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPhase("idle")} />
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="fixed inset-x-4 top-1/2 z-[71] mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-3xl bg-white p-7 text-center shadow-2xl">
              <Burst />
              <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mint text-4xl">
                ✓
              </motion.div>
              <p className="mt-4 font-display text-3xl font-extrabold">You&apos;re booked!</p>
              <p className="mt-1 text-ink/60">{done.label}</p>
              <p className="mt-1 text-sm text-ink/60">{venue.name} · {rupees(done.amount)}</p>
              {done.share < done.amount && (
                <a href={whatsappShare(`Booked ${done.label} at ${venue.name} 🏟️ Your share is ${rupees(done.share)}. Send it to me on UPI 🙏`)} target="_blank" rel="noreferrer" className="mt-4 block rounded-2xl bg-[#25D366] py-3 font-semibold text-white">
                  Ask friends for their share on WhatsApp
                </a>
              )}
              <Link href="/bookings" className="btn-primary mt-3 block">View my bookings</Link>
              <button onClick={() => setPhase("idle")} className="mt-2 text-sm text-ink/60 underline">Book another slot</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
