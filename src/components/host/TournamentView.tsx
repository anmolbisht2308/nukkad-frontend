"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { whenIST, timeIST } from "@/lib/format";
import { roundName, statusLabel, type Match, type TournamentDetail } from "@/lib/host";
import { rupees } from "@/lib/pay";
import { useAuth } from "../Auth";
import { Bracket } from "./Bracket";
import { LeagueTable } from "./LeagueTable";
import { RegisterSheet } from "./RegisterSheet";

const ease = [0.22, 1, 0.36, 1] as const;

function LiveCard({ m, title }: { m: Match; title: string }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-3xl bg-ink p-5 text-cream">
      <motion.div className="absolute inset-0 rounded-3xl ring-2 ring-chili" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chili">
        <span className="live-dot !bg-chili" /> Live · {title}
        {m.court && <span className="font-normal text-cream/50">· {m.court}</span>}
      </p>
      <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate font-display text-xl font-bold">{m.teamA?.name}</p>
        <p className="font-mono text-3xl font-bold tabular-nums">
          <Score v={m.scoreA ?? 0} /> <span className="text-cream/40">–</span> <Score v={m.scoreB ?? 0} />
        </p>
        <p className="truncate text-right font-display text-xl font-bold">{m.teamB?.name}</p>
      </div>
    </motion.div>
  );
}

/** Number that flips when the score changes. */
function Score({ v }: { v: number }) {
  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={v} className="inline-block" initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.35, ease }}>
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FixtureRow({ m }: { m: Match }) {
  const winA = m.winner && m.winner._id === m.teamA?._id;
  const winB = m.winner && m.winner._id === m.teamB?._id;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_10px_30px_-24px_rgba(0,0,0,0.4)]">
      <span className="w-16 shrink-0 text-xs text-ink/50">{m.startsAt ? timeIST(m.startsAt) : ""}</span>
      <span className={`min-w-0 flex-1 truncate text-right ${winA ? "font-bold" : winB ? "text-ink/45" : ""}`}>{m.teamA?.name ?? "TBD"}</span>
      <span className={`w-16 shrink-0 rounded-lg py-1 text-center font-mono font-bold tabular-nums ${m.status === "live" ? "bg-chili text-white" : m.status === "done" ? "bg-ink text-cream" : "bg-ink/5 text-ink/40"}`}>
        {m.status === "scheduled" ? "vs" : `${m.scoreA ?? 0}–${m.scoreB ?? 0}`}
      </span>
      <span className={`min-w-0 flex-1 truncate ${winB ? "font-bold" : winA ? "text-ink/45" : ""}`}>{m.teamB?.name ?? (m.bye ? "Bye" : "TBD")}</span>
    </div>
  );
}

export default function TournamentView({ initial }: { initial: TournamentDetail }) {
  const { user, withLogin } = useAuth();
  const [fresh, setFresh] = useState<TournamentDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const data = fresh ?? initial;
  const { tournament: t, teams, matches, rounds, standings } = data;
  const slug = initial.tournament.slug;

  // refetch with auth (myTeam / organiser) and keep live scores fresh
  useEffect(() => {
    let alive = true;
    const load = () => api<TournamentDetail>(`/api/host/tournaments/${slug}`).then((d) => alive && setFresh(d)).catch(() => {});
    load();
    const id = t.status === "live" ? setInterval(load, 10_000) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [slug, user, tick, t.status]);

  const live = matches.filter((m) => m.status === "live");
  const champion = t.champion ? teams.find((x) => x._id === t.champion) : null;
  const full = t.teamsCount >= t.maxTeams;
  const pct = Math.min(100, (t.teamsCount / t.maxTeams) * 100);
  const byRound = Array.from({ length: rounds }, (_, i) => matches.filter((m) => m.round === i + 1 && !m.bye));

  return (
    <main className="pb-24">
      <section className="relative overflow-hidden pb-20 pt-28 text-white" style={{ background: `linear-gradient(135deg, ${t.theme.from}, ${t.theme.to})` }}>
        <motion.div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-white/10" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} />
        <motion.span className="pointer-events-none absolute -bottom-10 right-4 select-none text-[12rem] opacity-20 sm:right-16" animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }} transition={{ duration: 6, repeat: Infinity }}>
          {t.emoji}
        </motion.span>
        <div className="relative mx-auto max-w-5xl px-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1 ${t.status === "live" ? "bg-ink/80" : "bg-white/20"} backdrop-blur`}>
              {t.status === "live" && <span className="live-dot mr-1.5 !bg-chili" />}
              {statusLabel[t.status]}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 capitalize backdrop-blur">{t.sport} · {t.format}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">📅 {whenIST(t.startsAt)}</span>
            {(t.venueName || t.venue) && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">📍 {t.venueName ?? t.venue?.name}</span>}
          </motion.div>
          <motion.h1 className="hero-in mt-4 max-w-3xl font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            {t.title}
          </motion.h1>
          {t.prizes[0] && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-lg text-white/90">
              🏆 {t.prizes[0]}
            </motion.p>
          )}
        </div>
      </section>

      <div className="mx-auto -mt-10 grid max-w-5xl gap-6 px-5 md:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {champion && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="rounded-3xl bg-gradient-to-r from-sun to-saffron p-6 text-ink shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wider">Champions</p>
              <p className="font-display text-4xl font-extrabold">🏆 {champion.name}</p>
            </motion.div>
          )}

          <AnimatePresence>
            {live.length > 0 && (
              <div className="space-y-3">
                {live.map((m) => (
                  <LiveCard key={m._id} m={m} title={roundName(m.round, rounds, t.format)} />
                ))}
              </div>
            )}
          </AnimatePresence>

          {t.format === "league" && standings && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-extrabold">Points table</h2>
              <LeagueTable rows={standings} />
            </section>
          )}

          {t.format === "knockout" && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-extrabold">Bracket</h2>
              <Bracket matches={matches} rounds={rounds} />
            </section>
          )}

          {matches.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl font-extrabold">Fixtures & results</h2>
              <div className="space-y-6">
                {byRound.map((ms, i) =>
                  ms.length ? (
                    <div key={i}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
                        {roundName(i + 1, rounds, t.format)} {ms[0].startsAt && `· ${whenIST(ms[0].startsAt)}`}
                      </p>
                      <div className="space-y-2">
                        {ms.map((m) => (
                          <FixtureRow key={m._id} m={m} />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-2xl font-extrabold">Teams ({teams.length})</h2>
            {teams.length === 0 ? (
              <p className="rounded-3xl bg-white p-6 text-ink/60">No teams yet. Be the first to register!</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((tm, i) => (
                  <motion.div key={tm._id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.05 }} className="rounded-2xl bg-white p-4">
                    <p className="font-display text-lg font-bold">{tm.name}</p>
                    <p className="line-clamp-1 text-sm text-ink/55">{tm.players.map((p) => p.name).join(", ")}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {t.rules && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-2xl font-extrabold">Rules</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/70">{t.rules}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-ink/55">Entry per team</p>
                <p className="font-display text-4xl font-extrabold">{t.entryFee ? rupees(t.entryFee) : "Free"}</p>
              </div>
              <p className="text-right text-sm text-ink/55">
                {t.teamSize} per side
                <br />
                {t.format === "knockout" ? "Knockout" : "League"}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-ink/55">
                <span>{t.teamsCount} / {t.maxTeams} teams</span>
                <span>{full ? "Full" : `${t.maxTeams - t.teamsCount} spots left`}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.theme.from}, ${t.theme.to})` }} />
              </div>
            </div>
            {data.myTeam?.paid ? (
              <p className="mt-5 rounded-2xl bg-mint/20 py-3 text-center font-semibold">✓ {data.myTeam.name} is registered</p>
            ) : t.status === "registration" && !full ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => withLogin(() => setOpen(true))} className="btn-primary mt-5 w-full">
                Register your team
              </motion.button>
            ) : (
              <p className="mt-5 rounded-2xl bg-ink/5 py-3 text-center text-sm font-semibold text-ink/60">{t.status === "registration" ? "All spots taken" : "Registrations closed"}</p>
            )}
            {data.isOrganizer && (
              <Link href="/host" className="mt-2 block rounded-2xl bg-ink/5 py-3 text-center text-sm font-semibold">
                Manage in organiser console →
              </Link>
            )}
          </div>
          {t.prizes.length > 0 && (
            <div className="rounded-3xl bg-white p-6">
              <h3 className="font-display text-xl font-bold">Prizes</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {t.prizes.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span>{["🥇", "🥈", "🥉"][i] ?? "🎖️"}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/tournaments" className="block text-center text-sm font-medium text-ink/60 underline underline-offset-4">
            ← All tournaments
          </Link>
        </aside>
      </div>

      <RegisterSheet
        t={t}
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          setTick((x) => x + 1);
        }}
      />
    </main>
  );
}
