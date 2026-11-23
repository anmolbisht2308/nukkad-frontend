"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { api, assetUrl, type Business, type Deal, type Event } from "@/lib/api";
import { compact, kindLabel, timeIST, untilIST, whenIST } from "@/lib/format";
import { useAuth } from "../Auth";
import { useCoupon } from "../ui/Coupon";
import { Countdown } from "../ui/Countdown";
import { toast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;
export const cardIn = (i: number) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-5%" },
  transition: { duration: 0.6, delay: Math.min(i, 6) * 0.06, ease },
});

const grad = (b: Pick<Business, "theme">) => ({ background: `linear-gradient(135deg, ${b.theme.from}, ${b.theme.to})` });

function Art({ b, className = "" }: { b: Pick<Business, "theme" | "emoji"> & { photo?: string }; className?: string }) {
  if (b.photo)
    return (
      <div className={`relative overflow-hidden ${className}`} style={grad(b)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(b.photo)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      </div>
    );
  return (
    <div className={`relative grid place-items-center overflow-hidden ${className}`} style={grad(b)}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
      <div className="absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-black/10" />
      <span className="relative text-5xl drop-shadow-lg transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-125">{b.emoji}</span>
    </div>
  );
}

export function TruckCard({ b, i }: { b: Business; i: number }) {
  return (
    <motion.div {...cardIn(i)} className="w-64 shrink-0 snap-start">
      <Link href={`/b/${b.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.35)] transition hover:-translate-y-1">
        <Art b={b} className="h-32" />
        <div className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="live-dot" /> LIVE {b.live?.until && untilIST(b.live.until)}
          </p>
          <p className="mt-1 font-display text-lg font-bold leading-tight">{b.name}</p>
          <p className="mt-1 line-clamp-1 text-sm text-ink/60">📍 {b.live?.spot ?? b.area}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function OpeningCard({ b, i }: { b: Business; i: number }) {
  const { withLogin } = useAuth();
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(b.opening.notifyCount);
  return (
    <motion.div {...cardIn(i)} className="w-72 shrink-0 snap-start overflow-hidden rounded-3xl bg-ink text-cream">
      <Link href={`/b/${b.slug}`} className="group block">
        <Art b={b} className="h-28" />
      </Link>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-deep">Opening in</p>
        {b.opening.date && (
          <p className="mt-1 text-lg">
            <Countdown to={b.opening.date} compact />
          </p>
        )}
        <Link href={`/b/${b.slug}`} className="mt-2 block font-display text-xl font-bold leading-tight">{b.name}</Link>
        <p className="line-clamp-1 text-sm text-cream/60">{b.tagline}</p>
        <button
          onClick={() =>
            withLogin(async () => {
              try {
                const r = await api<{ added: boolean }>(`/api/businesses/${b.slug}/notify`, { method: "POST" });
                setDone(true);
                if (r.added) setCount((c) => c + 1);
                toast.success(`We'll ping you when ${b.name} opens`, { emoji: "🔔" });
              } catch (x) {
                toast.error(x);
              }
            })
          }
          className={`mt-4 w-full rounded-2xl py-2.5 text-sm font-semibold transition ${done ? "bg-mint text-ink" : "bg-white/10 hover:bg-white/20"}`}
        >
          {done ? "✓ We'll notify you" : `🔔 Notify me · ${compact(count)} waiting`}
        </button>
      </div>
    </motion.div>
  );
}

export function NewCard({ b, i }: { b: Business; i: number }) {
  return (
    <motion.div {...cardIn(i)} className="w-60 shrink-0 snap-start">
      <Link href={`/b/${b.slug}`} className="group block">
        <div className="relative overflow-hidden rounded-3xl">
          <Art b={b} className="aspect-[4/5]" />
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-chili-deep">New</span>
        </div>
        <p className="mt-3 font-display text-lg font-bold leading-tight">{b.name}</p>
        <p className="text-sm text-ink/60">{kindLabel[b.kind]} · {b.area}</p>
      </Link>
    </motion.div>
  );
}

export function DealCard({ d, i }: { d: Deal; i: number }) {
  const { claim } = useCoupon();
  const b = typeof d.business === "object" ? d.business : null;
  const left = Math.max(0, d.limit - d.claimedCount);
  const pct = Math.min(100, (d.claimedCount / d.limit) * 100);
  if (!b) return null;
  return (
    <motion.div {...cardIn(i)} className="flex gap-4 rounded-3xl bg-white p-3 pr-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
      <Link href={`/b/${b.slug}`} className="group shrink-0">
        <Art b={b} className="h-24 w-24 rounded-2xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink/60">{b.name} · {b.area}</p>
        <p className="font-display text-lg font-bold leading-tight">{d.title}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/5">
          <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, ease }} className="h-full rounded-full bg-gradient-to-r from-saffron to-chili" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-ink/60">{left} left · ends {whenIST(d.endsAt)}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => claim(d._id, d.title, b)} className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-cream">
            Claim
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function EventCard({ e, i }: { e: Event; i: number }) {
  const { withLogin } = useAuth();
  const [going, setGoing] = useState(false);
  const [count, setCount] = useState(e.rsvpCount);
  return (
    <motion.div {...cardIn(i)} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-cream text-3xl">{e.emoji}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-saffron-deep">{whenIST(e.startsAt)}</p>
        <Link href={`/events/${e.slug}`} className="font-display text-lg font-bold leading-tight hover:underline">{e.title}</Link>
        <p className="truncate text-sm text-ink/60">📍 {e.venue} · {kindLabel[e.kind]} · {e.price ? `₹${e.price}` : "Free"}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() =>
          withLogin(async () => {
            try {
              const r = await api<{ going: boolean }>(`/api/events/${e.slug}/rsvp`, { method: "POST" });
              setGoing(r.going);
              setCount((c) => c + (r.going ? 1 : -1));
              if (r.going) toast.success("You're in!", { emoji: e.emoji, description: `${e.title} · ${whenIST(e.startsAt)}` });
              else toast.info("RSVP removed", { description: e.title });
            } catch (x) {
              toast.error(x);
            }
          })
        }
        className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-2 text-xs font-semibold transition ${going ? "bg-mint text-ink" : "bg-ink text-cream"}`}
      >
        <span>{going ? "Going ✓" : "I'm in"}</span>
        <span className="font-normal opacity-70">{count} going</span>
      </motion.button>
    </motion.div>
  );
}

export { timeIST };
