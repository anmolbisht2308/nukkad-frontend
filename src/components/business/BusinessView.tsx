"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, API_URL, isLive, type Business, type Deal } from "@/lib/api";
import { compact, kindLabel, mapsLink, untilIST, whenIST } from "@/lib/format";
import { useAuth } from "../Auth";
import { useCoupon } from "../ui/Coupon";
import { Countdown } from "../ui/Countdown";

const ease = [0.22, 1, 0.36, 1] as const;
type Me = { following: boolean; notified: boolean; claims: Record<string, string> };

export default function BusinessView({ business: b, deals }: { business: Business; deals: Deal[] }) {
  const { user, withLogin } = useAuth();
  const { claim, show } = useCoupon();
  const [meState, setMe] = useState<Me | null>(null);
  const me = user ? meState : null;
  const [followers, setFollowers] = useState(b.followersCount);
  const [notifyCount, setNotifyCount] = useState(b.opening.notifyCount);
  const soon = b.opening.status === "coming_soon";
  const live = isLive(b);

  useEffect(() => {
    if (!user) return;
    api<{ me?: Me }>(`/api/businesses/${b.slug}`).then((r) => setMe(r.me ?? null)).catch(() => {});
  }, [user, b.slug]);

  const follow = () =>
    withLogin(async () => {
      const r = await api<{ following: boolean }>(`/api/businesses/${b.slug}/follow`, { method: "POST" });
      setMe((m) => ({ ...(m ?? { notified: false, claims: {} }), following: r.following }));
      setFollowers((n) => n + (r.following ? 1 : -1));
    });

  const notify = () =>
    withLogin(async () => {
      const r = await api<{ added: boolean }>(`/api/businesses/${b.slug}/notify`, { method: "POST" });
      setMe((m) => ({ ...(m ?? { following: false, claims: {} }), notified: true }));
      if (r.added) setNotifyCount((n) => n + 1);
    });

  return (
    <main className="pb-24">
      {/* hero */}
      <section className="relative overflow-hidden pb-16 pt-28 text-white" style={{ background: `linear-gradient(135deg, ${b.theme.from}, ${b.theme.to})` }}>
        {b.photo && (
          <>
            <motion.img src={`${API_URL}${b.photo}`} alt="" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease }} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </>
        )}
        <motion.div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 6, repeat: Infinity }} />
        <motion.div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-black/10" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 px-5 md:flex-row md:items-end">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
            className="grid h-36 w-36 shrink-0 place-items-center rounded-[2.5rem] bg-white/20 text-7xl shadow-2xl ring-1 ring-white/30 backdrop-blur"
          >
            <motion.span animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              {b.emoji}
            </motion.span>
          </motion.div>
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }} className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{kindLabel[b.kind]}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">📍 {b.area}</span>
              {b.verified && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">✓ Verified</span>}
              {live && (
                <span className="flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1">
                  <span className="live-dot" /> Live {b.live?.until && untilIST(b.live.until)}
                </span>
              )}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8, ease }} className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              {b.name}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-3 max-w-xl text-lg text-white/85">
              {b.tagline}
            </motion.p>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-8 grid max-w-5xl gap-6 px-5 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {soon && b.opening.date && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }} className="relative rounded-3xl bg-ink p-6 text-cream shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-saffron">Grand opening · {whenIST(b.opening.date)}</p>
              <div className="mt-3">
                <Countdown to={b.opening.date} />
              </div>
              <button onClick={notify} className={`mt-5 w-full rounded-2xl py-3 font-semibold transition ${me?.notified ? "bg-mint text-ink" : "bg-gradient-to-r from-saffron to-chili text-white"}`}>
                {me?.notified ? "✓ You'll get an alert on opening day" : `🔔 Notify me on opening day · ${compact(notifyCount)} waiting`}
              </button>
            </motion.div>
          )}

          {live && b.live?.spot && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }} className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><span className="live-dot" /> Parked right now</p>
              <p className="mt-1 font-display text-2xl font-bold">{b.live.spot}</p>
              {b.live.location && (
                <a href={mapsLink(b.live.location.coordinates)} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-block">
                  Get directions →
                </a>
              )}
            </motion.div>
          )}

          {deals.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-2xl font-extrabold">Deals</h2>
              <div className="space-y-3">
                {deals.map((d, i) => {
                  const code = me?.claims[d._id];
                  return (
                    <motion.div key={d._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08, ease }} className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
                      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(${b.theme.from}, ${b.theme.to})` }} />
                      <div className="flex-1">
                        <p className="font-display text-xl font-bold leading-tight">{d.title}</p>
                        {d.description && <p className="mt-1 text-sm text-ink/60">{d.description}</p>}
                        <p className="mt-2 text-xs text-ink/50">{Math.max(0, d.limit - d.claimedCount)} left · ends {whenIST(d.endsAt)}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => (code ? show({ code, title: d.title, business: b }) : claim(d._id, d.title, b))}
                        className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold ${code ? "bg-mint text-ink" : "bg-ink text-cream"}`}
                      >
                        {code ? "View code" : "Claim"}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, ease }} className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <h2 className="font-display text-2xl font-extrabold">About</h2>
            <p className="mt-2 leading-relaxed text-ink/70">{b.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {b.tags.map((t) => (
                <span key={t} className="chip">#{t}</span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.aside initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, ease }} className="space-y-4 md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="font-display text-3xl font-extrabold">{compact(followers)}</p>
                <p className="text-xs text-ink/55">followers</p>
              </div>
              <div>
                <p className="font-display text-3xl font-extrabold">{b.rating.count ? `★ ${b.rating.avg.toFixed(1)}` : "New"}</p>
                <p className="text-xs text-ink/55">{b.rating.count ? `${b.rating.count} reviews` : "no reviews yet"}</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={follow} className={`mt-5 w-full rounded-2xl py-3 font-semibold transition ${me?.following ? "bg-ink/5 text-ink" : "bg-ink text-cream"}`}>
              {me?.following ? "✓ Following" : b.kind === "food_truck" ? "Follow: get alerts when it parks nearby" : "Follow"}
            </motion.button>
            <a href={mapsLink(b.location.coordinates)} target="_blank" rel="noreferrer" className="mt-2 block w-full rounded-2xl bg-ink/5 py-3 text-center font-semibold">
              Open in Maps
            </a>
          </div>
          <div className="rounded-3xl bg-white p-6 text-sm shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <p className="flex justify-between py-1"><span className="text-ink/55">Hours</span><span className="font-medium">{b.hours}</span></p>
            <p className="flex justify-between py-1"><span className="text-ink/55">Price</span><span className="font-medium">{"₹".repeat(b.priceLevel)}</span></p>
            <p className="flex justify-between py-1"><span className="text-ink/55">Address</span><span className="text-right font-medium">{b.address}</span></p>
          </div>
          <Link href="/pulse" className="block text-center text-sm font-medium text-ink/60 underline underline-offset-4">← Back to what&apos;s on</Link>
        </motion.aside>
      </div>
    </main>
  );
}
