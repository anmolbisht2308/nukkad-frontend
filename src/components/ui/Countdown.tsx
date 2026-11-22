"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

function Digit({ v }: { v: string }) {
  return (
    <span className="relative inline-block overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={v} initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="inline-block">
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className="opacity-0">00d 00h</span>;
  const p = parts(new Date(to).getTime() - now);
  const items: [number, string][] = compact ? [[p.d, "d"], [p.h, "h"], [p.m, "m"]] : [[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  return (
    <span className={`inline-flex ${compact ? "gap-1.5" : "gap-3"}`}>
      {items.map(([n, l]) => (
        <span key={l} className={compact ? "" : "flex flex-col items-center"}>
          <span className={compact ? "font-semibold" : "font-display text-3xl font-bold"}>
            {String(n).padStart(2, "0").split("").map((c, i) => (
              <Digit key={i} v={c} />
            ))}
          </span>
          <span className={compact ? "text-[0.85em] opacity-70" : "text-[10px] uppercase tracking-widest opacity-60"}>{l}</span>
        </span>
      ))}
    </span>
  );
}
