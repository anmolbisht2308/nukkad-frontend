"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Auth";
import { api, ApiError } from "@/lib/api";
import { mapsLink } from "@/lib/format";
import { rupees } from "@/lib/pay";
import { gradient, longDate, rangeLabel, SPORT_META, whatsappShare, type Booking } from "@/lib/play";
import { toast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;
const statusChip: Record<Booking["status"], string> = {
  pending: "bg-sun/30 text-ink",
  confirmed: "bg-mint/25 text-emerald-800",
  cancelled: "bg-ink/5 text-ink/50",
  completed: "bg-sky/20 text-sky-900",
  no_show: "bg-chili/10 text-chili",
};

function HostForm({ b, onDone }: { b: Booking; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [spots, setSpots] = useState(2);
  const [price, setPrice] = useState(Math.round(b.amount / (b.participants.length + 2) / 10) * 10);
  const [skill, setSkill] = useState("any");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-ink/15 py-2.5 text-sm font-semibold text-ink/70 hover:border-saffron hover:text-saffron">
          🙋 Short of players? Host an open game
        </button>
      ) : (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 overflow-hidden rounded-2xl bg-cream p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            try {
              await api("/api/play/games", { body: { bookingId: b._id, spots, pricePerHead: price, skill, note: note || undefined } });
              toast.success("Open game posted", { emoji: "🙋", description: `Looking for ${spots} player${spots > 1 ? "s" : ""}. We'll notify you as they join.` });
              onDone();
            } catch (x) {
              setErr((x as ApiError).message);
            }
          }}
        >
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col gap-1">Players needed<input type="number" min={1} max={20} value={spots} onChange={(e) => setSpots(Number(e.target.value))} className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron" /></label>
            <label className="flex flex-col gap-1">₹ per head<input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron" /></label>
            <label className="flex flex-col gap-1">Level
              <select value={skill} onChange={(e) => setSkill(e.target.value)} className="rounded-xl border-2 border-ink/10 bg-white px-2 py-2 text-sm outline-none">
                <option value="any">Any</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note, e.g. tennis ball, 6 per side" className="w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron" />
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-2.5 text-sm">Post open game</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-2xl px-3 text-sm text-ink/55">Cancel</button>
          </div>
          {err && <p className="text-xs text-chili">{err}</p>}
        </motion.form>
      )}
    </div>
  );
}

function BookingCard({ b, i, reload }: { b: Booking; i: number; reload: () => void }) {
  const label = `${longDate(b.date)}, ${rangeLabel(b.startHour, b.hours)}`;
  const live = b.status === "confirmed" && b.upcoming;
  const friends = b.participants.slice(1);
  return (
    <motion.div layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.05, ease }} className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-4 p-4">
        <Link href={`/play/${b.business.slug}`} className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl" style={gradient(b.business.theme)}>
          {SPORT_META[b.court.sport].emoji}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-saffron">{label}</p>
          <p className="font-display text-lg font-bold leading-tight">{b.business.name}</p>
          <p className="text-sm text-ink/55">
            {b.court.name} · {rupees(b.amount)} · {b.payment.mode === "online" ? (b.payment.status === "refund_due" ? "refund on its way" : "paid online") : b.payment.status === "paid" ? "paid at venue" : "pay at venue"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusChip[b.status]}`}>{b.status.replace("_", "-")}</span>
      </div>

      {friends.length > 0 && b.status !== "cancelled" && (
        <div className="border-t border-ink/5 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">Split · {rupees(b.participants[0].share)} each</p>
          <div className="flex flex-wrap gap-2">
            {friends.map((p, k) => (
              <div key={k} className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={async () => {
                    await api(`/api/play/bookings/${b._id}/participants/${k + 1}/paid`, { method: "POST" });
                    reload();
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${p.paid ? "bg-mint text-ink" : "bg-ink/5 text-ink/70"}`}
                  title="Tap to mark paid / unpaid"
                >
                  {p.paid ? "✓" : "○"} {p.name}
                </motion.button>
                {!p.paid && (
                  <a
                    href={whatsappShare(`Hey ${p.name}! Booked ${b.court.name} at ${b.business.name}, ${label} 🏟️ Your share is ${rupees(p.share)}. Please send it on UPI 🙏`)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#25D366] px-2 py-1.5 text-xs font-semibold text-white"
                    title="Remind on WhatsApp"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(live || b.game) && (
        <div className="border-t border-ink/5 px-4 pb-4 pt-3">
          {b.game && b.game.status !== "cancelled" ? (
            <p className="rounded-2xl bg-mint/15 px-3 py-2 text-sm">
              🙋 Open game: <b>{b.game.players.length}/{b.game.spots}</b> joined {b.game.status === "full" && "· full!"}
            </p>
          ) : (
            live && <HostForm b={b} onDone={reload} />
          )}
          {live && (
            <div className="mt-3 flex gap-2">
              {b.business.location && (
                <a href={mapsLink(b.business.location.coordinates)} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl bg-ink/5 py-2.5 text-center text-sm font-semibold">
                  Directions
                </a>
              )}
              <button
                onClick={async () => {
                  if (!window.confirm("Cancel this booking? Free cancellation up to 2 hours before start.")) return;
                  try {
                    await api(`/api/play/bookings/${b._id}/cancel`, { method: "POST" });
                    toast.info("Booking cancelled", { description: `${b.business.name} · ${label}` });
                    reload();
                  } catch (x) {
                    toast.error(x);
                  }
                }}
                className="flex-1 rounded-2xl py-2.5 text-sm font-semibold text-chili hover:bg-chili/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function BookingsPage() {
  const { user, ready, withLogin } = useAuth();
  const [items, setItems] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ items: Booking[] }>("/api/play/bookings/me")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [user, tick]);

  const reload = () => setTick((t) => t + 1);
  const shown = (items ?? []).filter((b) => (tab === "upcoming" ? b.upcoming && b.status !== "cancelled" : !b.upcoming || b.status === "cancelled"));
  if (tab === "upcoming") shown.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <main className="mx-auto max-w-3xl px-5 pb-28 pt-28">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">My bookings</h1>
      {ready && !user && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center">
          <p className="text-ink/60">Log in to see your turf and court bookings.</p>
          <button onClick={() => withLogin()} className="btn-primary mt-4">Log in</button>
        </div>
      )}
      {user && (
        <>
          <div className="mt-6 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
            {(["upcoming", "past"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className="relative rounded-full px-4 py-2 text-sm font-semibold capitalize">
                {tab === t && <motion.span layoutId="bk-tab" className="absolute inset-0 rounded-full bg-ink" />}
                <span className={`relative ${tab === t ? "text-cream" : "text-ink/60"}`}>{t}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {!items && [0, 1].map((k) => <div key={k} className="h-28 skeleton rounded-3xl" />)}
            <AnimatePresence mode="popLayout">
              {shown.map((b, i) => (
                <BookingCard key={b._id} b={b} i={i} reload={reload} />
              ))}
            </AnimatePresence>
            {items && shown.length === 0 && (
              <div className="rounded-3xl bg-white p-8 text-center">
                <p className="text-4xl">🏏</p>
                <p className="mt-2 text-ink/60">{tab === "upcoming" ? "Nothing booked yet." : "No past bookings."}</p>
                <Link href="/play" className="btn-primary mt-4 inline-block">Book a turf</Link>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
