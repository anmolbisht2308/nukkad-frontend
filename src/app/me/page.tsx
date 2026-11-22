"use client";

import Link from "next/link";
import { animate, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/Auth";
import { useCoupon } from "@/components/ui/Coupon";
import { api, type Claim } from "@/lib/api";
import { whenIST } from "@/lib/format";

type Tier = { name: string; emoji: string; next: number | null };
type Points = { points: number; tier: Tier; history: { _id: string; amount: number; reason: string; createdAt: string }[] };
type Leader = { name: string; points: number; tier: Tier };

function RollingNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => ref.current && (ref.current.textContent = Math.round(v).toLocaleString("en-IN")) });
    return () => c.stop();
  }, [value]);
  return <span ref={ref}>0</span>;
}

export default function Me() {
  const { user, ready, withLogin } = useAuth();
  const { show } = useCoupon();
  const [tab, setTab] = useState<"coupons" | "points">("coupons");
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [pts, setPts] = useState<Points | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    api<{ top: Leader[] }>("/api/leaderboard", { auth: false }).then((r) => setLeaders(r.top)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    api<{ claims: Claim[] }>("/api/me/claims").then((r) => setClaims(r.claims)).catch(() => setClaims([]));
    api<Points>("/api/me/points").then(setPts).catch(() => {});
  }, [user]);

  if (ready && !user)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <p className="text-5xl">🙂</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">Your Nukkad</h1>
        <p className="mt-2 text-ink/60">Coupons, bookings and Nukkad Points, all in one place.</p>
        <button onClick={() => withLogin()} className="btn-primary mt-6">Log in</button>
      </main>
    );

  const progress = pts?.tier.next ? Math.min(100, (pts.points / pts.tier.next) * 100) : 100;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Hi {user?.name ?? "there"} 👋</h1>

      {/* points card */}
      <motion.div initial={{ opacity: 0, y: 20, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ transformPerspective: 800 }} className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1d1440] to-[#3a1240] p-6 text-cream shadow-xl">
        <motion.div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-saffron/30 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />
        <p className="relative text-sm text-cream/60">Nukkad Points</p>
        <p className="relative font-display text-6xl font-extrabold tracking-tight">
          🪙 <RollingNumber value={pts?.points ?? 0} />
        </p>
        <p className="relative mt-2 text-sm">
          {pts?.tier.emoji} <b>{pts?.tier.name}</b>
          {pts?.tier.next ? <span className="text-cream/60"> · {pts.tier.next - pts.points} to the next tier</span> : " · top tier"}
        </p>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.2, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-saffron to-sun" />
        </div>
        <p className="relative mt-3 text-xs text-cream/50">Earn points when you redeem deals, book turfs, join games, RSVP to events and enter tournaments.</p>
      </motion.div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/bookings" className="rounded-2xl bg-white p-4 font-semibold shadow-sm transition hover:-translate-y-0.5">🏏 My bookings</Link>
        <Link href="/inbox" className="rounded-2xl bg-white p-4 font-semibold shadow-sm transition hover:-translate-y-0.5">🔔 Notifications</Link>
      </div>

      <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
        {(["coupons", "points"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative rounded-full px-4 py-2 text-sm font-semibold capitalize">
            {tab === t && <motion.span layoutId="me-tab" className="absolute inset-0 rounded-full bg-ink" />}
            <span className={`relative ${tab === t ? "text-cream" : "text-ink/60"}`}>{t === "coupons" ? "My coupons" : "Points & leaderboard"}</span>
          </button>
        ))}
      </div>

      {tab === "coupons" ? (
        <div className="mt-5 space-y-3">
          {claims?.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center">
              <p className="text-4xl">🎟️</p>
              <p className="mt-2 text-ink/60">No coupons yet.</p>
              <Link href="/pulse" className="btn-primary mt-4 inline-block">Find deals</Link>
            </div>
          )}
          {claims?.map((c, i) => {
            const used = c.status === "redeemed";
            return (
              <motion.button
                key={c._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                disabled={used}
                onClick={() => show({ code: c.code, title: c.deal.title, business: c.business })}
                className={`flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)] transition ${used ? "opacity-50" : "hover:-translate-y-0.5"}`}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `linear-gradient(135deg, ${c.business.theme.from}, ${c.business.theme.to})` }}>
                  {c.business.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink/55">{c.business.name}</p>
                  <p className="font-display text-lg font-bold leading-tight">{c.deal.title}</p>
                  <p className="text-xs text-ink/50">{used ? `Used ${c.redeemedAt ? whenIST(c.redeemedAt) : ""}` : `Valid till ${whenIST(c.deal.endsAt)}`}</p>
                </div>
                <span className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${used ? "bg-ink/5 line-through" : "bg-ink text-cream"}`}>{c.code}</span>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-5">
            <h2 className="font-display text-xl font-bold">History</h2>
            {pts?.history.length === 0 && <p className="mt-2 text-sm text-ink/55">No points yet. Redeem your first deal!</p>}
            <div className="mt-2 divide-y divide-ink/5">
              {pts?.history.map((h) => (
                <div key={h._id} className="flex items-center justify-between py-2 text-sm">
                  <span className="min-w-0 truncate">{h.reason}</span>
                  <span className="shrink-0 font-semibold text-emerald-600">+{h.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <h2 className="font-display text-xl font-bold">🏆 City leaderboard</h2>
            <div className="mt-2 space-y-1">
              {leaders.map((l, i) => (
                <motion.div key={l.name + i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm odd:bg-cream/60">
                  <span className="w-6 text-center font-display font-bold">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                  <span className="flex-1 truncate">{l.name}</span>
                  <span className="text-xs text-ink/50">{l.tier.emoji}</span>
                  <span className="font-semibold">{l.points}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
