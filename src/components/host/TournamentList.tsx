"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { whenIST } from "@/lib/format";
import { statusLabel, type Tournament, type TournamentStatus } from "@/lib/host";
import { rupees } from "@/lib/pay";

const ease = [0.22, 1, 0.36, 1] as const;
const tabs: TournamentStatus[] = ["registration", "live", "completed"];

function Card({ t, i }: { t: Tournament; i: number }) {
  const pct = Math.min(100, (t.teamsCount / t.maxTeams) * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, delay: i * 0.07, ease }}>
      <Link href={`/tournaments/${t.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.4)] transition hover:-translate-y-1">
        <div className="relative h-36 overflow-hidden p-5 text-white" style={{ background: `linear-gradient(135deg, ${t.theme.from}, ${t.theme.to})` }}>
          <span className="absolute -bottom-6 -right-2 text-[7rem] opacity-30 transition-transform duration-700 group-hover:-rotate-12 group-hover:scale-110">{t.emoji}</span>
          <span className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${t.status === "live" ? "bg-ink/80" : "bg-white/25"}`}>
            {t.status === "live" && <span className="live-dot !bg-chili" />}
            {statusLabel[t.status]}
          </span>
          <p className="relative mt-3 max-w-[80%] font-display text-2xl font-extrabold leading-tight">{t.title}</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-ink/60">📅 {whenIST(t.startsAt)}</p>
          <p className="truncate text-sm text-ink/60">📍 {t.venueName ?? t.venue?.name ?? t.area ?? BRAND.city}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-ink/55">
            <span>{t.teamsCount}/{t.maxTeams} teams</span>
            <span className="capitalize">{t.format}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.07, ease }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.theme.from}, ${t.theme.to})` }} />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-ink/50">Entry</p>
              <p className="font-display text-xl font-extrabold">{t.entryFee ? rupees(t.entryFee) : "Free"}</p>
            </div>
            {t.prizes[0] && <p className="max-w-[60%] truncate text-right text-sm font-semibold">🏆 {t.prizes[0]}</p>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TournamentList() {
  const [tab, setTab] = useState<TournamentStatus>("registration");
  const [items, setItems] = useState<Tournament[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api<{ items: Tournament[] }>("/api/host/tournaments", { auth: false })
      .then((r) => {
        setItems(r.items);
        // open on the most interesting tab that has something in it
        const firstNonEmpty = (["live", "registration", "completed"] as const).find((s) => r.items.some((t) => t.status === s));
        if (firstNonEmpty) setTab(firstNonEmpty);
      })
      .catch(() => setErr(true));
  }, []);

  const shown = items?.filter((t) => t.status === tab) ?? [];
  const count = (s: TournamentStatus) => items?.filter((t) => t.status === s).length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold uppercase tracking-widest text-saffron">
        Compete in {BRAND.city}
      </motion.p>
      <motion.h1 className="hero-in mt-2 max-w-3xl font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
        Tournaments & leagues
      </motion.h1>
      <p className="mt-3 max-w-xl text-ink/60">Box cricket cups, pickleball leagues and Sunday football. Register your team, pay the entry in one tap, and follow live scores.</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
          {tabs.map((s) => (
            <button key={s} onClick={() => setTab(s)} className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold xs:px-4">
              {tab === s && <motion.span layoutId="t-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={`relative flex items-center gap-1.5 ${tab === s ? "text-cream" : "text-ink/60"}`}>
                {s === "live" && <span className="live-dot !bg-chili" />}
                {statusLabel[s]}
                <span className="text-xs opacity-60">{count(s)}</span>
              </span>
            </button>
          ))}
        </div>
        <Link href="/host" className="text-sm font-semibold text-ink/70 underline underline-offset-4">
          Organising one? Open the console →
        </Link>
      </div>

      {err && <p className="mt-10 text-chili">Couldn&apos;t load tournaments. Is the API running?</p>}
      {!items && !err && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 skeleton rounded-3xl" />
          ))}
        </div>
      )}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((t, i) => (
            <Card key={t._id} t={t} i={i} />
          ))}
        </AnimatePresence>
      </div>
      {items && shown.length === 0 && <p className="mt-6 text-ink/60">Nothing here right now.</p>}
    </main>
  );
}
