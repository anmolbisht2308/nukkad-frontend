"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/* ───────────────────────── Toasts ─────────────────────────
   Call from anywhere (no hook needed):
     toast.success("Deal is live", { description: "Followers were notified" })
     toast.error(err)                       // Error / ApiError / string
     toast.info("Copied")
     toast.success("You're booked!", { celebrate: true, emoji: "🏏" })
     toast.promise(save(), { loading: "Saving…", success: "Saved", error: (e) => e.message })
   <Toaster /> is mounted once in the root layout. */

type Kind = "success" | "error" | "info" | "loading";
type Action = { label: string; onClick: () => void };
type Options = { description?: ReactNode; emoji?: string; duration?: number; action?: Action; celebrate?: boolean; id?: string };
type Item = Options & { id: string; kind: Kind; title: ReactNode; createdAt: number };

const DEFAULT_MS: Record<Kind, number> = { success: 3600, info: 3600, error: 5200, loading: Infinity };
const MAX_VISIBLE = 3;

let items: Item[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
let seq = 0;

function push(kind: Kind, title: ReactNode, opts: Options = {}) {
  const id = opts.id ?? `t${++seq}`;
  const next: Item = { ...opts, id, kind, title, createdAt: Date.now() };
  items = items.some((t) => t.id === id) ? items.map((t) => (t.id === id ? next : t)) : [next, ...items].slice(0, 6);
  emit();
  if (kind === "error" && typeof navigator !== "undefined") navigator.vibrate?.(30);
  return id;
}

function dismiss(id?: string) {
  items = id ? items.filter((t) => t.id !== id) : [];
  emit();
}

const messageOf = (e: unknown) => (typeof e === "string" ? e : e instanceof Error ? e.message : "Something went wrong");

export const toast = Object.assign((title: ReactNode, opts?: Options) => push("info", title, opts), {
  success: (title: ReactNode, opts?: Options) => push("success", title, opts),
  info: (title: ReactNode, opts?: Options) => push("info", title, opts),
  loading: (title: ReactNode, opts?: Options) => push("loading", title, opts),
  error: (e: unknown, opts?: Options) => push("error", messageOf(e), opts),
  dismiss,
  async promise<T>(p: Promise<T>, m: { loading: ReactNode; success: ReactNode | ((v: T) => ReactNode); error?: ReactNode | ((e: unknown) => ReactNode) }, opts?: Options) {
    const id = push("loading", m.loading, opts);
    try {
      const v = await p;
      push("success", typeof m.success === "function" ? m.success(v) : m.success, { ...opts, id });
      return v;
    } catch (e) {
      push("error", m.error === undefined ? messageOf(e) : typeof m.error === "function" ? m.error(e) : m.error, { ...opts, id });
      throw e;
    }
  },
});

/* ───────────── visuals ───────────── */

const ACCENT: Record<Kind, { ring: string; bg: string; bar: string }> = {
  success: { ring: "ring-mint/40", bg: "bg-mint", bar: "bg-mint" },
  error: { ring: "ring-chili/40", bg: "bg-chili", bar: "bg-chili" },
  info: { ring: "ring-sky/40", bg: "bg-gradient-to-br from-saffron to-chili", bar: "bg-saffron" },
  loading: { ring: "ring-white/10", bg: "bg-white/10", bar: "bg-white/40" },
};

function Icon({ t }: { t: Item }) {
  const a = ACCENT[t.kind];
  if (t.emoji)
    return (
      <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.05 }} className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/10 text-lg ring-4 ${a.ring}`}>
        {t.emoji}
      </motion.span>
    );
  return (
    <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-2xl ring-4 ${a.ring} ${a.bg}`}>
      {t.kind === "loading" ? (
        <motion.span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {t.kind === "success" && <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }} />}
          {t.kind === "error" && (
            <>
              <motion.path d="M7 7l10 10" stroke="white" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.1 }} />
              <motion.path d="M17 7L7 17" stroke="white" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.28 }} />
            </>
          )}
          {t.kind === "info" && (
            <>
              <motion.path d="M12 11v6" stroke="white" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.1 }} />
              <circle cx="12" cy="7.5" r="1.4" fill="white" stroke="none" />
            </>
          )}
        </svg>
      )}
    </span>
  );
}

/** Little confetti pop for big moments (booked, stall secured). */
function Burst() {
  const [bits] = useState(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 46;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, r: Math.random() * 360, c: ["#ff7a1a", "#ff2e63", "#2ee6a6", "#4cc9f0", "#ffd23f"][i % 5], w: 4 + Math.random() * 4 };
    })
  );
  return (
    <span className="pointer-events-none absolute left-7 top-1/2">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ background: b.c, width: b.w, height: b.w * 1.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: b.x, y: b.y + 30, opacity: 0, rotate: b.r, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        />
      ))}
    </span>
  );
}

function ToastCard({ t, index, expanded, onHover }: { t: Item; index: number; expanded: boolean; onHover: (h: boolean) => void }) {
  const reduce = useReducedMotion();
  const ms = t.duration ?? DEFAULT_MS[t.kind];
  const [paused, setPaused] = useState(false);
  const left = useRef(ms);
  const started = useRef(0);

  // auto-dismiss timer that pauses while hovered / stack expanded
  useEffect(() => {
    if (!Number.isFinite(ms)) return;
    if (paused || expanded) return;
    started.current = Date.now();
    const id = setTimeout(() => dismiss(t.id), left.current);
    return () => {
      clearTimeout(id);
      left.current -= Date.now() - started.current;
    };
  }, [paused, expanded, ms, t.id, t.createdAt]);

  // collapsed stack: cards peek out behind the front one
  const collapsedY = index * -14;
  const y = expanded ? index * -78 : collapsedY;
  const scale = expanded ? 1 : 1 - index * 0.05;
  const hidden = index >= MAX_VISIBLE;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600 || info.offset.y > 60) dismiss(t.id);
  };

  return (
    <motion.li
      layout={!reduce}
      role={t.kind === "error" ? "alert" : "status"}
      aria-live={t.kind === "error" ? "assertive" : "polite"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: "blur(6px)" }}
      animate={{ opacity: hidden ? 0 : 1 - (expanded ? 0 : index * 0.12), y, scale, filter: "blur(0px)", zIndex: 100 - index }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      drag={index === 0 || expanded ? true : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      onMouseEnter={() => {
        setPaused(true);
        onHover(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
        onHover(false);
      }}
      style={{ pointerEvents: hidden ? "none" : "auto", transformOrigin: "top center" }}
      className="absolute bottom-0 right-0 w-full touch-none select-none"
    >
      <motion.div
        animate={t.kind === "error" && !reduce ? { x: [0, -7, 6, -4, 2, 0] } : undefined}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative overflow-hidden rounded-3xl bg-[#16161c] p-3 pr-4 text-cream shadow-[0_18px_50px_-12px_rgba(11,11,15,0.55)] ring-1 ring-white/10 backdrop-blur-xl"
      >
        {/* soft glow in the accent colour */}
        <span className={`pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl ${ACCENT[t.kind].bar}`} />
        {t.celebrate && !reduce && <Burst />}
        <div className="relative flex items-center gap-3">
          <Icon t={t} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs leading-snug text-cream/60">{t.description}</p>}
          </div>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-ink transition active:scale-95"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-cream/40 transition hover:bg-white/10 hover:text-cream">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {/* time-left bar; pauses with the timer while hovered */}
        {Number.isFinite(ms) && (
          <span
            className={`absolute bottom-0 left-0 h-[3px] w-full origin-left ${ACCENT[t.kind].bar}`}
            style={{ animation: `toast-bar ${ms}ms linear forwards`, animationPlayState: paused || expanded ? "paused" : "running" }}
          />
        )}
      </motion.div>
    </motion.li>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  const [hovered, setHovered] = useState(false);
  const expanded = hovered && list.length > 1;

  return (
    <section aria-label="Notifications" className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[200] flex justify-center px-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px] md:px-0">
      <ol
        className="pointer-events-auto relative h-0 w-full max-w-[380px]"
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence initial={false}>
          {list.map((t, i) => (
            <ToastCard key={t.id} t={t} index={i} expanded={expanded} onHover={(h) => h && setHovered(true)} />
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
