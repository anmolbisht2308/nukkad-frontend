"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useAuth } from "./Auth";
import { useCity } from "./City";
import { useLang, type Key } from "./Lang";

const links: { href: string; label: Key; emoji: string }[] = [
  { href: "/pulse", label: "pulse", emoji: "⚡" },
  { href: "/play", label: "play", emoji: "🏏" },
  { href: "/tournaments", label: "compete", emoji: "🏆" },
  { href: "/creators", label: "creators", emoji: "📸" },
];

/** Unread notification count, refreshed every 30s and on route change. */
function useUnread(enabled: boolean, path: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const load = () => api<{ unread: number }>("/api/me/notifications/unread").then((r) => setN(r.unread)).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [enabled, path]);
  return enabled ? n : 0;
}

function CityPicker({ dark }: { dark: boolean }) {
  const { city, cities, setCity } = useCity();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${dark ? "bg-mint/15 text-mint" : "bg-mint/20 text-emerald-700"}`}>
        {city.name} <span className="text-[8px]">▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 top-8 z-50 w-56 overflow-hidden rounded-2xl bg-white p-1 text-ink shadow-2xl ring-1 ring-ink/5">
            {cities.map((c) => (
              <button
                key={c.slug}
                onClick={() => {
                  setCity(c.slug);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-ink/5 ${c.slug === city.slug ? "font-semibold" : ""}`}
              >
                {c.name}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.status === "live" ? "bg-mint/20 text-emerald-700" : c.status === "launching" ? "bg-sun/30 text-amber-700" : "bg-ink/5 text-ink/50"}`}>
                  {c.status === "live" ? "Live" : c.status === "launching" ? "Launching" : "Soon"}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountMenu({ dark }: { dark: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = [
    { href: "/me", label: "My coupons & points" },
    { href: "/bookings", label: "My bookings" },
    { href: "/inbox", label: "Notifications" },
    { href: "/creator", label: "Creator studio" },
    ...(user.role === "merchant" || user.role === "admin"
      ? [
          { href: "/merchant", label: "Business dashboard" },
          { href: "/merchant/venue", label: "Venue calendar" },
        ]
      : []),
    ...(user.role === "organizer" || user.role === "admin" ? [{ href: "/host", label: "Organiser console" }] : []),
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account" className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${dark ? "bg-white/15" : "bg-ink text-cream"}`}>
        {(user.name ?? user.phone).slice(0, 1).toUpperCase()}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-2xl bg-white p-1 text-ink shadow-2xl ring-1 ring-ink/5">
              <p className="px-3 pb-1 pt-2 text-xs text-ink/50">{user.name ?? `+91 ${user.phone}`}</p>
              {items.map((i) => (
                <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-ink/5">
                  {i.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-chili hover:bg-chili/5"
              >
                Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const path = usePathname();
  const { user, withLogin } = useAuth();
  const unread = useUnread(!!user, path);
  const { lang, setLang, t } = useLang();
  const { scrollY } = useScroll();
  const [pastHero, setPastHero] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setPastHero(y > window.innerHeight * 0.8));
  // dark glass over the 3D hero, light glass everywhere else
  const dark = path === "/" && !pastHero;
  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${dark ? "text-cream" : "text-ink"}`}
      >
        <div className={`mx-3 mt-3 flex max-w-6xl items-center justify-between rounded-full px-4 py-2 backdrop-blur-xl transition-colors duration-300 sm:mx-auto sm:px-5 ${dark ? "bg-white/5 ring-1 ring-white/10" : "bg-white/75 shadow-sm ring-1 ring-ink/5"}`}>
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-saffron to-chili text-base text-white">न</span>
              <span className="hidden sm:inline">{BRAND.name}</span>
            </Link>
            <CityPicker dark={dark} />
          </div>
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="relative rounded-full px-3 py-1.5">
                {path.startsWith(l.href) && <motion.span layoutId="nav-pill" className={`absolute inset-0 rounded-full ${dark ? "bg-white/10" : "bg-ink/5"}`} />}
                <span className="relative">{t(l.label)}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label="Switch language" className={`rounded-full px-2 py-1 text-xs font-bold ${dark ? "bg-white/10" : "bg-ink/5"}`}>
              {lang === "en" ? "हिं" : "EN"}
            </button>
            {user && (
              <Link href="/inbox" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className={`relative grid h-8 w-8 place-items-center rounded-full ${dark ? "bg-white/10" : "bg-ink/5"}`}>
                <motion.span key={unread} animate={unread ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }}>
                  🔔
                </motion.span>
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-chili px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}
            {user ? (
              <AccountMenu dark={dark} />
            ) : (
              <button onClick={() => withLogin()} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${dark ? "bg-cream text-ink" : "bg-ink text-cream"}`}>
                {t("login")}
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* app-style bottom tab bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/5 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {[{ href: "/", label: "home" as Key, emoji: "🏠" }, ...links.slice(0, 3), { href: "/me", label: "me" as Key, emoji: "🙂" }].map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink/60">
                {active && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full bg-saffron" />}
                <motion.span animate={{ scale: active ? 1.15 : 1, y: active ? -1 : 0 }} className="text-lg">
                  {l.emoji}
                </motion.span>
                <span className={active ? "text-ink" : ""}>{t(l.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
