"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { api, type Feed } from "@/lib/api";
import { DealCard, EventCard, NewCard, OpeningCard, TruckCard } from "./Cards";
import { useCity } from "../City";
import { useLang } from "../Lang";

const tabs = [
  { id: "today", label: "today" },
  { id: "tonight", label: "tonight" },
  { id: "weekend", label: "weekend" },
  { id: "week", label: "week" },
] as const;
type When = (typeof tabs)[number]["id"];

function Section({ title, sub, children, row = false }: { title: string; sub?: string; children: ReactNode; row?: boolean }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between px-5 xl:px-0">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          {sub && <p className="text-sm text-ink/60">{sub}</p>}
        </div>
      </div>
      {row ? <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 xl:scroll-px-0 xl:px-0">{children}</div> : <div className="grid gap-3 px-5 md:grid-cols-2 xl:px-0 [&>*]:min-w-0">{children}</div>}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="mt-12 space-y-4 px-5 xl:px-0">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 skeleton rounded-3xl" />
      ))}
    </div>
  );
}

export default function Pulse() {
  const [when, setWhen] = useState<When>("today");
  const { city } = useCity();
  const { t, lang } = useLang();
  const [data, setData] = useState<{ key: string; feed: Feed } | null>(null);
  const [err, setErr] = useState(false);
  const key = `${city.slug}:${when}`;
  const feed = data?.key === key ? data.feed : null;

  useEffect(() => {
    let alive = true;
    api<Feed>(`/api/feed?when=${when}&city=${city.slug}`)
      .then((f) => alive && setData({ key: `${city.slug}:${when}`, feed: f }))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [when, city.slug]);

  const empty = feed && !feed.liveTrucks.length && !feed.events.length && !feed.deals.length;

  return (
    <main className="mx-auto max-w-6xl pb-24 pt-28">
      <div className="px-5 xl:px-0">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm font-medium text-ink/60">
          <span className="live-dot" /> {city.name} pulse
        </motion.p>
        <motion.h1 className="hero-in mt-2 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
          {t("whatsOn")} {lang === "en" ? t(tabs.find((x) => x.id === when)!.label).toLowerCase() : t(tabs.find((x) => x.id === when)!.label)}
        </motion.h1>
        <div className="no-scrollbar mt-6 inline-flex max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setWhen(tab.id)} className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold xs:px-4">
              {when === tab.id && <motion.span layoutId="when" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={`relative ${when === tab.id ? "text-cream" : "text-ink/60"}`}>{t(tab.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mt-10 px-5 text-chili">Couldn&apos;t reach the server. Is the API running?</p>}
      <AnimatePresence mode="wait">
        {!feed ? (
          <motion.div key="s" exit={{ opacity: 0 }}>
            {!err && <Skeleton />}
          </motion.div>
        ) : (
          <motion.div key={when} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {feed.liveTrucks.length > 0 && (
              <Section title={t("liveNow")} sub={t("liveSub")} row>
                {feed.liveTrucks.map((b, i) => (
                  <TruckCard key={b._id} b={b} i={i} />
                ))}
              </Section>
            )}
            {feed.events.length > 0 && (
              <Section title={t("happening")} sub={t("happeningSub")}>
                {feed.events.map((e, i) => (
                  <EventCard key={e._id} e={e} i={i} />
                ))}
              </Section>
            )}
            {feed.comingSoon.length > 0 && (
              <Section title={t("openingSoon")} sub={t("openingSub")} row>
                {feed.comingSoon.map((b, i) => (
                  <OpeningCard key={b._id} b={b} i={i} />
                ))}
              </Section>
            )}
            {feed.deals.length > 0 && (
              <Section title={t("hotDeals")} sub={t("dealsSub")}>
                {feed.deals.map((d, i) => (
                  <DealCard key={d._id} d={d} i={i} />
                ))}
              </Section>
            )}
            {feed.newOpenings.length > 0 && (
              <Section title={t("justOpened")} sub={t("justOpenedSub")} row>
                {feed.newOpenings.map((b, i) => (
                  <NewCard key={b._id} b={b} i={i} />
                ))}
              </Section>
            )}
            {empty && city.status === "coming_soon" && (
              <div className="mx-5 mt-12 rounded-3xl bg-ink p-8 text-cream sm:mx-0">
                <p className="font-display text-3xl font-bold">{city.name} is coming soon 🚀</p>
                <p className="mt-2 text-cream/70">We&apos;re signing up food trucks, cafés and venues here. Join the list to know when we launch.</p>
                <Link href="/#business" className="btn-primary mt-5 inline-block bg-cream text-ink">Join the list</Link>
              </div>
            )}
            {empty && city.status !== "coming_soon" && <p className="mt-12 px-5 text-ink/60">Quiet {when} so far. Check back later or switch the tab above.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
