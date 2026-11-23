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
      <button onClick={() => setOpen(!open)} className={`flex max-w-[8.5rem] items-center gap-1 truncate rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${dark ? "bg-mint/15 text-mint hover:bg-mint/25" : "bg-mint/20 text-emerald-700 hover:bg-mint/30"}`}>
        <span className="truncate">{city.name}</span> <span className="text-[8px]">▼</span>
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
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.status === "live" ? "bg-mint/20 text-emerald-700" : c.status === "launching" ? "bg-sun/30 text-amber-700" : "bg-ink/5 text-ink/60"}`}>
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
              <p className="px-3 pb-1 pt-2 text-xs text-ink/60">{user.name ?? `+91 ${user.phone}`}</p>
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
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-chili-deep hover:bg-chili/5"
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
        className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300 ${dark ? "text-cream" : "text-ink"}`}
      >
        <div className={`mx-2 mt-2 flex max-w-6xl items-center justify-between gap-2 rounded-full py-1.5 pl-2 pr-1.5 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 xs:mx-3 xs:mt-3 xs:pl-3 xs:pr-2 sm:mx-auto sm:px-4 lg:mx-auto ${dark ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-white/80 shadow-[0_8px_30px_-18px_rgba(11,11,15,0.45)] ring-1 ring-ink/[0.06]"}`}>
          <div className="flex min-w-0 items-center gap-1.5 xs:gap-2">
            <Link href="/" aria-label={`${BRAND.name} home`} className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-saffron to-chili text-base text-white shadow-[0_6px_16px_-6px_#ff7a1a]">न</span>
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
          <div className="flex shrink-0 items-center gap-1 xs:gap-1.5">
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label="Switch language" className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-bold transition ${dark ? "bg-white/10 hover:bg-white/20" : "bg-ink/5 hover:bg-ink/10"}`}>
              {lang === "en" ? "हिं" : "EN"}
            </button>
            {user && (
              <Link href="/inbox" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className={`relative grid h-8 w-8 place-items-center rounded-full ${dark ? "bg-white/10" : "bg-ink/5"}`}>
                <motion.span key={unread} animate={unread ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }}>
                  🔔
                </motion.span>
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-chili-deep px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}
            {user ? (
              <AccountMenu dark={dark} />
            ) : (
              <button onClick={() => withLogin()} className={`h-8 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 xs:px-4 ${dark ? "bg-cream text-ink" : "bg-ink text-cream"}`}>
                {t("login")}
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* app-style floating tab bar on phones and folded foldables */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 rounded-[1.6rem] bg-ink/90 p-1.5 text-cream shadow-[0_18px_40px_-16px_rgba(11,11,15,0.65)] ring-1 ring-white/10 backdrop-blur-xl">
          {[{ href: "/", label: "home" as Key, emoji: "🏠" }, ...links.slice(0, 3), { href: "/me", label: "me" as Key, emoji: "🙂" }].map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.2rem] text-[10px] font-semibold xs:text-[11px]">
                {active && <motion.span layoutId="tab-bubble" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-[1.2rem] bg-gradient-to-br from-saffron to-chili shadow-[0_8px_20px_-8px_#ff7a1a]" />}
                <motion.span animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }} className="relative text-[1.15rem] leading-none">
                  {l.emoji}
                </motion.span>
                <span className={`relative ${active ? "text-white" : "text-cream/60"}`}>{t(l.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
