"use client";

import { motion } from "motion/react";
import { roundName, type Match } from "@/lib/host";

/* Knockout bracket: one column per round, cards absolutely placed so each
   match sits between the two it came from, with SVG connectors drawing in. */

const COL = 230; // card width
const GAP = 56; // space between columns (connectors live here)
const H = 78; // card height
const SLOT = H + 18; // vertical space per round-1 match

const yCenter = (round: number, order: number) => (order + 0.5) * SLOT * 2 ** (round - 1);

function Side({ name, score, win, lost }: { name?: string; score?: number | null; win: boolean; lost: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${win ? "font-bold" : ""} ${lost ? "opacity-45" : ""}`}>
      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
        {win && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />}
        <span className="truncate">{name ?? "TBD"}</span>
      </span>
      <span className="font-mono text-sm tabular-nums">{score ?? ""}</span>
    </div>
  );
}

export function Bracket({ matches, rounds }: { matches: Match[]; rounds: number }) {
  if (!matches.length) return <p className="rounded-3xl bg-white p-6 text-ink/60">Fixtures will appear here once the organiser generates them.</p>;
  const firstRound = matches.filter((m) => m.round === 1).length;
  const height = firstRound * SLOT;
  const width = rounds * COL + (rounds - 1) * GAP;
  const byKey = new Map(matches.map((m) => [m._id, m]));

  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pb-4">
      <div className="relative" style={{ width, height: height + 32 }}>
        {/* round headings */}
        {Array.from({ length: rounds }, (_, i) => (
          <p key={i} className="absolute top-0 text-xs font-semibold uppercase tracking-wider text-ink/45" style={{ left: i * (COL + GAP) }}>
            {roundName(i + 1, rounds, "knockout")}
          </p>
        ))}
        <svg className="pointer-events-none absolute left-0 top-8" width={width} height={height} fill="none">
          {matches
            .filter((m) => m.nextMatch && byKey.has(m.nextMatch))
            .map((m, i) => {
              const next = byKey.get(m.nextMatch!)!;
              const x1 = (m.round - 1) * (COL + GAP) + COL;
              const y1 = yCenter(m.round, m.order);
              const x2 = (next.round - 1) * (COL + GAP);
              const y2 = yCenter(next.round, next.order);
              const xm = x1 + GAP / 2;
              const decided = m.status === "done";
              return (
                <motion.path
                  key={m._id}
                  d={`M${x1} ${y1} H${xm} V${y2} H${x2}`}
                  stroke={decided ? "#FF7A1A" : "rgba(11,11,15,0.15)"}
                  strokeWidth={decided ? 2.5 : 1.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 + m.round * 0.25 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                />
              );
            })}
        </svg>
        {matches.map((m) => {
          const winA = !!m.winner && m.winner._id === m.teamA?._id;
          const winB = !!m.winner && m.winner._id === m.teamB?._id;
          const live = m.status === "live";
          return (
            <motion.div
              key={m._id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: m.round * 0.2 + m.order * 0.04 }}
              className={`absolute overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] ring-1 ${live ? "ring-2 ring-chili" : "ring-ink/5"}`}
              style={{ left: (m.round - 1) * (COL + GAP), top: 32 + yCenter(m.round, m.order) - H / 2, width: COL, height: H }}
            >
              {live && (
                <span className="absolute right-2 top-1 flex items-center gap-1 text-[10px] font-bold uppercase text-chili">
                  <span className="live-dot !bg-chili" /> Live
                </span>
              )}
              <Side name={m.teamA?.name} score={m.scoreA} win={winA} lost={winB} />
              <div className="mx-3 h-px bg-ink/5" />
              {m.bye ? <p className="px-3 py-1.5 text-xs italic text-ink/40">Bye: advances</p> : <Side name={m.teamB?.name} score={m.scoreB} win={winB} lost={winA} />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
