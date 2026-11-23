"use client";

import { LayoutGroup, motion } from "motion/react";
import type { StandingRow } from "@/lib/host";

/** Points table; rows animate to their new position when results change. */
export function LeagueTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-[2rem_1fr_repeat(5,2.25rem)_3rem] gap-1 border-b border-ink/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink/60 sm:grid-cols-[2rem_1fr_repeat(5,3rem)_3.5rem]">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-center">+/-</span>
        <span className="text-right">Pts</span>
      </div>
      <LayoutGroup>
        {rows.map((r, i) => (
          <motion.div
            layout
            key={r.team}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.04 }}
            className={`grid grid-cols-[2rem_1fr_repeat(5,2.25rem)_3rem] items-center gap-1 px-4 py-3 text-sm sm:grid-cols-[2rem_1fr_repeat(5,3rem)_3.5rem] ${i === 0 ? "bg-saffron/10" : i % 2 ? "bg-cream/40" : ""}`}
          >
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-saffron-deep text-white" : "bg-ink/5"}`}>{i + 1}</span>
            <span className="truncate font-semibold">{r.name}</span>
            <span className="text-center tabular-nums">{r.p}</span>
            <span className="text-center tabular-nums">{r.w}</span>
            <span className="text-center tabular-nums">{r.d}</span>
            <span className="text-center tabular-nums">{r.l}</span>
            <span className={`text-center tabular-nums ${r.diff > 0 ? "text-emerald-700" : r.diff < 0 ? "text-chili-deep" : ""}`}>{r.diff > 0 ? `+${r.diff}` : r.diff}</span>
            <span className="text-right font-display text-lg font-extrabold tabular-nums">{r.pts}</span>
          </motion.div>
        ))}
      </LayoutGroup>
    </div>
  );
}
