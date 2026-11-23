"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, type Business } from "@/lib/api";
import { kindLabel, mapsLink, timeIST, whenIST } from "@/lib/format";
import { eventTheme, type EventDetail, type Stall } from "@/lib/host";
import { pay, rupees, type PaymentOrder } from "@/lib/pay";
import { useAuth } from "../Auth";
import { toast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;

function StallMap({ slug, title }: { slug: string; title: string }) {
  const { user, withLogin } = useAuth();
  const [stalls, setStalls] = useState<Stall[] | null>(null);
  const [mine, setMine] = useState<Business[]>([]);
  const [picked, setPicked] = useState<Stall | null>(null);
  const [biz, setBiz] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const isMerchant = user?.role === "merchant" || user?.role === "admin";

  useEffect(() => {
    api<{ stalls: Stall[] }>(`/api/host/events/${slug}/stalls`, { auth: false }).then((r) => setStalls(r.stalls)).catch(() => setStalls([]));
  }, [slug, tick]);
  useEffect(() => {
    if (!isMerchant) return;
    api<{ items: Business[] }>("/api/merchant/businesses")
      .then((r) => {
        setMine(r.items);
        setBiz((b) => b || r.items.find((x) => x.kind === "food_truck" || x.kind === "street_stall")?._id || r.items[0]?._id || "");
      })
      .catch(() => {});
  }, [isMerchant]);

  if (!stalls || stalls.length === 0) return null;
  const rows = Math.max(...stalls.map((s) => s.row)) + 1;
  const cols = Math.max(...stalls.map((s) => s.col)) + 1;
  const free = stalls.filter((s) => s.status === "available").length;

  const book = async () => {
    if (!picked || !biz) return;
    setBusy(true);
    try {
      const r = await api<{ stall: Stall; order?: PaymentOrder }>(`/api/host/stalls/${picked._id}/book`, { body: { businessId: biz } });
      if (r.order) {
        const proof = await pay(r.order, { name: title, description: `Stall ${picked.label}` });
        await api(`/api/host/stalls/${picked._id}/confirm`, { body: { proof } });
      }
      toast.success(`Stall ${picked.label} is yours!`, { emoji: "🍢", description: "See you at the event.", celebrate: true });
      setPicked(null);
      setTick((x) => x + 1);
    } catch (e) {
      toast.error(e);
      setTick((x) => x + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Stall map</h2>
          <p className="text-sm text-ink/60">{free} of {stalls.length} stalls free · food trucks & stalls book here</p>
        </div>
        <div className="flex gap-3 text-xs text-ink/60">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-mint/40" /> Free</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-ink" /> Booked</span>
        </div>
      </div>
      <div className="no-scrollbar mt-5 overflow-x-auto pb-2">
        <div className="mx-auto w-fit">
          <p className="mb-2 rounded-full bg-ink/5 py-1 text-center text-[11px] font-semibold uppercase tracking-widest text-ink/60">Stage · entrance this side</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))` }}>
            {Array.from({ length: rows * cols }, (_, idx) => {
              const s = stalls.find((x) => x.row === Math.floor(idx / cols) && x.col === idx % cols);
              if (!s) return <div key={idx} />;
              const taken = s.status !== "available";
              const sel = picked?._id === s._id;
              return (
                <motion.button
                  key={s._id}
                  type="button"
                  disabled={taken}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: sel ? 1.06 : 1 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={taken ? undefined : { y: -4 }}
                  onClick={() => withLogin(() => setPicked(s))}
                  title={taken ? s.business?.name ?? "Booked" : `${s.label} · ${rupees(s.price)}`}
                  className={`relative flex h-20 flex-col items-center justify-center rounded-2xl text-xs font-semibold transition ${
                    taken ? "text-white" : sel ? "bg-saffron-deep text-white ring-4 ring-saffron/30" : "bg-mint/25 text-ink hover:bg-mint/45"
                  } ${s.size === "large" ? "ring-1 ring-inset ring-ink/10" : ""}`}
                  style={taken && s.business ? { background: `linear-gradient(135deg, ${s.business.theme.from}, ${s.business.theme.to})` } : taken ? { background: "#0b0b0f" } : undefined}
                >
                  <span className="absolute left-2 top-1.5 text-[10px] opacity-70">{s.label}</span>
                  {taken ? (
                    <>
                      <span className="text-2xl">{s.business?.emoji ?? "🔒"}</span>
                      <span className="line-clamp-1 max-w-full px-1 text-[10px]">{s.status === "held" ? "On hold" : s.business?.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base">{s.size === "large" ? "🚚" : "⛺"}</span>
                      <span>{rupees(s.price)}</span>
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {picked && (
          <motion.div key={picked._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-2xl bg-cream p-4">
            <p className="font-display text-xl font-bold">
              Stall {picked.label} · {picked.size} · {rupees(picked.price)}
            </p>
            {isMerchant ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <select aria-label="Your business" value={biz} onChange={(e) => setBiz(e.target.value)} className="min-w-0 flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-2.5 outline-none">
                  {mine.map((b) => (
                    <option key={b._id} value={b._id}>{b.emoji} {b.name}</option>
                  ))}
                </select>
                <button onClick={book} disabled={busy || !biz} className="btn-primary">
                  {busy ? "Booking…" : picked.price ? `Pay ${rupees(picked.price)} & book` : "Book free"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink/60">Stalls are for businesses. Log in with your business number to book one for your food truck or stall.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function EventView({ initial }: { initial: EventDetail }) {
  const { user, withLogin } = useAuth();
  const [fresh, setFresh] = useState<EventDetail | null>(null);
  const d = fresh ?? initial;
  const e = d.event;
  const theme = eventTheme[e.kind] ?? { from: "#FF7A1A", to: "#FF2E63" };
  const left = Math.max(0, e.capacity - e.rsvpCount);

  useEffect(() => {
    if (!user) return;
    api<EventDetail>(`/api/host/events/${initial.event.slug}`).then(setFresh).catch(() => {});
  }, [user, initial.event.slug]);

  const rsvp = () =>
    withLogin(async () => {
      try {
        const r = await api<{ going: boolean }>(`/api/events/${e.slug}/rsvp`, { method: "POST" });
        setFresh({ ...d, going: r.going, event: { ...e, rsvpCount: e.rsvpCount + (r.going ? 1 : -1) } });
        if (r.going) toast.success("You're in!", { emoji: e.emoji ?? "🎉", description: `${e.title} · we'll remind you before it starts.` });
        else toast.info("RSVP removed", { description: e.title });
      } catch (x) {
        toast.error(x);
      }
    });

  return (
    <main className="pb-24">
      <section className="relative overflow-hidden pb-20 pt-28 text-white" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
        <motion.div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 7, repeat: Infinity }} />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-5 md:flex-row md:items-end">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="grid h-32 w-32 shrink-0 place-items-center rounded-[2.2rem] bg-white/20 text-6xl ring-1 ring-white/30 backdrop-blur">
            <motion.span animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>{e.emoji}</motion.span>
          </motion.div>
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold uppercase tracking-widest text-white/80">
              {kindLabel[e.kind] ?? e.kind} · {whenIST(e.startsAt)}
            </motion.p>
            <motion.h1 className="hero-in mt-2 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              {e.title}
            </motion.h1>
            {e.organizer && <p className="mt-3 text-white/85">by {e.organizer}</p>}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-10 grid max-w-5xl gap-6 px-5 md:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }} className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <h2 className="font-display text-2xl font-extrabold">About</h2>
            <p className="mt-2 leading-relaxed text-ink/70">{e.description}</p>
          </motion.div>
          <StallMap slug={e.slug} title={e.title} />
        </div>
        <motion.aside initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease }} className="space-y-4 md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-ink/60">When</p>
            <p className="font-display text-xl font-bold">{whenIST(e.startsAt)}{e.endsAt ? ` – ${timeIST(e.endsAt)}` : ""}</p>
            <p className="mt-3 text-sm text-ink/60">Where</p>
            <p className="font-display text-xl font-bold">{e.venue}</p>
            {e.area && <p className="text-sm text-ink/60">{e.area}</p>}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
              <span className="font-display text-2xl font-extrabold">{e.price ? rupees(e.price) : "Free"}</span>
              <span className="text-sm text-ink/60">{e.rsvpCount} going · {left} spots left</span>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={rsvp} className={`mt-4 w-full rounded-2xl py-3.5 font-semibold transition ${d.going ? "bg-mint text-ink" : "bg-ink text-cream"}`}>
              {d.going ? "✓ You're going (tap to cancel)" : "I'm in"}
            </motion.button>
            {e.location && (
              <a href={mapsLink(e.location.coordinates)} target="_blank" rel="noreferrer" className="mt-2 block rounded-2xl bg-ink/5 py-3 text-center font-semibold">
                Directions
              </a>
            )}
          </div>
          {d.stalls && (
            <div className="rounded-3xl bg-ink p-5 text-cream">
              <p className="text-sm text-cream/60">Own a food truck?</p>
              <p className="font-display text-xl font-bold">{d.stalls.available} stalls left from {rupees(d.stalls.minPrice)}</p>
            </div>
          )}
          <Link href="/pulse" className="block text-center text-sm font-medium text-ink/60 underline underline-offset-4">← Back to what&apos;s on</Link>
        </motion.aside>
      </div>
    </main>
  );
}
