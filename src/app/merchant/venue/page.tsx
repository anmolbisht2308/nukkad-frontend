"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/Auth";
import { api, ApiError, type Theme } from "@/lib/api";
import { rupees } from "@/lib/pay";
import { dateChip, hourLabel, longDate, nextDays, rangeLabel, SPORT_META, type Court, type Sport } from "@/lib/play";

type CalBooking = {
  _id: string;
  isStart: boolean;
  startHour: number;
  hours: number;
  source: "app" | "walkin" | "blocked";
  status: string;
  amount: number;
  name: string;
  phone?: string;
  players: number;
  payment: { mode: string; status: string };
  note?: string;
};
type CalSlot = { hour: number; price: number; peak: boolean; past: boolean; booking: CalBooking | null };
type Calendar = { date: string; courts: { _id: string; name: string; sport: Sport; slots: CalSlot[] }[] };
type Summary = { bookings: number; walkins: number; revenue: number; collected: number; noShows: number; utilisation: number; bookedHours: number; totalHours: number };
type VenueLite = { _id: string; slug: string; name: string; emoji: string; theme: Theme; area: string };
type Modal = { kind: "new"; courtId: string; courtName: string; hour: number; free: number } | { kind: "booking"; courtName: string; b: CalBooking };

const tone = (b: CalBooking) =>
  b.source === "blocked"
    ? "bg-[repeating-linear-gradient(45deg,#0b0b0f14_0_6px,#0b0b0f08_6px_12px)] text-ink/60"
    : b.status === "completed"
      ? "bg-sky/25 text-sky-950"
      : b.status === "no_show"
        ? "bg-chili/15 text-chili"
        : b.status === "pending"
          ? "bg-sun/40 text-ink"
          : b.source === "walkin"
            ? "bg-saffron/25 text-ink"
            : "bg-mint/30 text-ink";

function SummaryCard({ n, label, accent }: { n: string | number; label: string; accent?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl p-4 ${accent ? "bg-ink text-cream" : "bg-white"}`}>
      <p className="font-display text-3xl font-extrabold">{n}</p>
      <p className={`text-xs ${accent ? "text-cream/60" : "text-ink/55"}`}>{label}</p>
    </motion.div>
  );
}

function CourtEditor({ court, onSaved }: { court: Court; onSaved: () => void }) {
  const [f, setF] = useState({ pricePerHour: court.pricePerHour, peakPricePerHour: court.peakPricePerHour, peakFrom: court.peakFrom, peakTo: court.peakTo, openHour: court.openHour, closeHour: court.closeHour, active: court.active });
  const [msg, setMsg] = useState<string | null>(null);
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  const cell = "w-full rounded-xl border-2 border-ink/10 bg-white px-2 py-1.5 text-sm outline-none focus:border-saffron";
  return (
    <form
      className="grid grid-cols-2 items-end gap-2 rounded-2xl bg-cream p-3 text-xs sm:grid-cols-[1.2fr_repeat(6,1fr)_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api(`/api/venue/courts/${court._id}`, { method: "PATCH", body: f });
          setMsg("Saved ✓");
          onSaved();
        } catch (x) {
          setMsg((x as ApiError).message);
        }
        setTimeout(() => setMsg(null), 2000);
      }}
    >
      <div className="col-span-2 sm:col-span-1">
        <p className="font-display text-base font-bold">{SPORT_META[court.sport].emoji} {court.name}</p>
        <label className="mt-1 flex items-center gap-1 text-ink/60"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-saffron" /> Bookable</label>
      </div>
      <label>₹/hr<input type="number" min={0} value={f.pricePerHour} onChange={num("pricePerHour")} className={cell} /></label>
      <label>Peak ₹/hr<input type="number" min={0} value={f.peakPricePerHour} onChange={num("peakPricePerHour")} className={cell} /></label>
      <label>Peak from<input type="number" min={0} max={24} value={f.peakFrom} onChange={num("peakFrom")} className={cell} /></label>
      <label>Peak to<input type="number" min={0} max={24} value={f.peakTo} onChange={num("peakTo")} className={cell} /></label>
      <label>Opens<input type="number" min={0} max={23} value={f.openHour} onChange={num("openHour")} className={cell} /></label>
      <label>Closes<input type="number" min={1} max={24} value={f.closeHour} onChange={num("closeHour")} className={cell} /></label>
      <button className="col-span-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-cream sm:col-span-1">{msg ?? "Save"}</button>
    </form>
  );
}

export default function VenueDashboard() {
  const { user, ready, withLogin } = useAuth();
  const allowed = user?.role === "merchant" || user?.role === "admin";
  const days = useMemo(() => nextDays(7), []);
  const [venues, setVenues] = useState<VenueLite[] | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [date, setDate] = useState(days[0]);
  const [cal, setCal] = useState<Calendar | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [tick, setTick] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // modal form state
  const [mode, setMode] = useState<"walkin" | "block">("walkin");
  const [hours, setHours] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paid, setPaid] = useState(true);
  const [reason, setReason] = useState("Maintenance");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    api<{ items: VenueLite[] }>("/api/venue/venues")
      .then((r) => {
        setVenues(r.items);
        setVenueId((v) => v ?? r.items[0]?._id ?? null);
      })
      .catch(() => setVenues([]));
  }, [allowed]);

  useEffect(() => {
    if (!venueId || !allowed) return;
    const q = `business=${venueId}&date=${date}`;
    api<Calendar>(`/api/venue/calendar?${q}`).then(setCal).catch(() => {});
    api<Summary>(`/api/venue/summary?${q}`).then(setSummary).catch(() => {});
    api<{ items: Court[] }>(`/api/venue/courts?business=${venueId}`).then((r) => setCourts(r.items)).catch(() => {});
  }, [venueId, date, tick, allowed]);

  const reload = () => setTick((t) => t + 1);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };
  const venue = venues?.find((v) => v._id === venueId);
  const view = cal?.date === date ? cal : null;
  const hoursRange = view && view.courts.length ? Array.from(new Set(view.courts.flatMap((c) => c.slots.map((s) => s.hour)))).sort((a, b) => a - b) : [];

  const openNew = (courtId: string, courtName: string, hour: number) => {
    const c = view?.courts.find((x) => x._id === courtId);
    let free = 0;
    while (free < 4 && c?.slots.find((s) => s.hour === hour + free && !s.booking)) free++;
    setMode("walkin");
    setHours(1);
    setName("");
    setPhone("");
    setPaid(true);
    setReason("Maintenance");
    setErr(null);
    setModal({ kind: "new", courtId, courtName, hour, free });
  };

  const saveNew = async () => {
    if (modal?.kind !== "new") return;
    setErr(null);
    try {
      const base = { courtId: modal.courtId, date, startHour: modal.hour, hours };
      if (mode === "walkin") await api("/api/venue/walkin", { body: { ...base, name: name || "Walk-in", phone: phone || undefined, paid } });
      else await api("/api/venue/block", { body: { ...base, reason } });
      setModal(null);
      flash(mode === "walkin" ? "Walk-in added" : "Slot blocked");
      reload();
    } catch (x) {
      setErr((x as ApiError).message);
    }
  };

  const setStatus = async (b: CalBooking, status: "completed" | "no_show" | "cancelled") => {
    setErr(null);
    try {
      await api(`/api/venue/bookings/${b._id}`, { method: "PATCH", body: { status } });
      setModal(null);
      flash(status === "completed" ? "Marked as played" : status === "no_show" ? "Marked no-show" : "Cancelled, slot freed");
      reload();
    } catch (x) {
      setErr((x as ApiError).message);
    }
  };

  if (ready && !user)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <h1 className="font-display text-4xl font-extrabold">Venue calendar</h1>
        <p className="mt-2 text-ink/60">Log in with your venue&apos;s number.</p>
        <button onClick={() => withLogin()} className="btn-primary mt-6">Log in</button>
      </main>
    );
  if (ready && user && !allowed)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <h1 className="font-display text-4xl font-extrabold">Not a venue account</h1>
        <p className="mt-2 text-ink/60">This number isn&apos;t linked to a sports venue yet.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink/55">
            <Link href="/merchant" className="underline underline-offset-4">Business dashboard</Link> / Venue calendar
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{venue ? `${venue.emoji} ${venue.name}` : "…"}</h1>
        </div>
        <div className="flex gap-2">
          {venues && venues.length > 1 && (
            <select value={venueId ?? ""} onChange={(e) => setVenueId(e.target.value)} className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-2.5 font-medium outline-none">
              {venues.map((v) => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowPricing((s) => !s)} className="rounded-2xl bg-white px-4 py-2.5 font-semibold ring-1 ring-ink/10">💰 Pricing</button>
        </div>
      </div>
      {venues?.length === 0 && <p className="mt-6 text-ink/60">No sports venue on this account yet.</p>}

      <AnimatePresence>
        {showPricing && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 space-y-2 rounded-3xl bg-white p-4">
              <p className="font-display text-xl font-bold">Courts & pricing</p>
              <p className="text-xs text-ink/50">Hours are 0–24 (e.g. peak 18 → 22 means 6 PM to 10 PM).</p>
              {courts.map((c) => (
                <CourtEditor key={c._id + tick} court={c} onSaved={reload} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* date strip */}
      <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5">
        {days.map((d) => {
          const c = dateChip(d);
          const on = d === date;
          return (
            <button key={d} onClick={() => setDate(d)} className="relative flex w-16 shrink-0 flex-col items-center rounded-2xl py-2.5">
              {on && <motion.span layoutId="v-date" className="absolute inset-0 rounded-2xl bg-ink" />}
              {!on && <span className="absolute inset-0 rounded-2xl bg-white" />}
              <span className={`relative text-xs ${on ? "text-cream/70" : "text-ink/50"}`}>{c.top}</span>
              <span className={`relative font-display text-2xl font-bold ${on ? "text-cream" : ""}`}>{c.bottom}</span>
            </button>
          );
        })}
      </div>

      {summary && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <SummaryCard n={rupees(summary.revenue)} label={`revenue · ${longDate(date)}`} accent />
          <SummaryCard n={rupees(summary.collected)} label="collected" />
          <SummaryCard n={summary.bookings} label={`bookings (${summary.walkins} walk-in)`} />
          <SummaryCard n={`${summary.utilisation}%`} label={`utilisation · ${summary.bookedHours}/${summary.totalHours} hrs`} />
          <SummaryCard n={summary.noShows} label="no-shows" />
        </div>
      )}

      {/* legend */}
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-ink/60">
        {[
          ["bg-mint/30", "App booking"],
          ["bg-saffron/25", "Walk-in"],
          ["bg-sun/40", "Awaiting payment"],
          ["bg-sky/25", "Played"],
          ["bg-chili/15", "No-show"],
          ["bg-ink/10", "Blocked"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><i className={`h-3 w-3 rounded ${c}`} /> {l}</span>
        ))}
      </div>

      {/* calendar grid */}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-3">
        {!view && <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />}
        {view && (
          <div className="grid min-w-[560px] gap-1" style={{ gridTemplateColumns: `64px repeat(${view.courts.length}, minmax(120px, 1fr))` }}>
            <div />
            {view.courts.map((c) => (
              <div key={c._id} className="px-2 pb-2 text-center font-display text-sm font-bold">
                {SPORT_META[c.sport].emoji} {c.name}
              </div>
            ))}
            {hoursRange.map((h, ri) => (
              <div key={h} className="contents">
                <div className="flex items-center justify-end pr-2 text-xs font-medium text-ink/45">{hourLabel(h)}</div>
                {view.courts.map((c) => {
                  const s = c.slots.find((x) => x.hour === h);
                  if (!s) return <div key={c._id} className="rounded-xl bg-ink/[0.03]" />;
                  const b = s.booking;
                  return (
                    <motion.button
                      key={c._id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: s.past && !b ? 0.35 : 1, scale: 1 }}
                      transition={{ delay: Math.min(ri, 20) * 0.015 }}
                      whileHover={!s.past || b ? { scale: 1.02 } : undefined}
                      disabled={s.past && !b}
                      onClick={() => (b ? setModal({ kind: "booking", courtName: c.name, b }) : openNew(c._id, c.name, h))}
                      className={`relative h-12 rounded-xl px-2 text-left text-xs transition-colors ${b ? tone(b) : "bg-ink/[0.03] hover:bg-mint/15"} ${b && !b.isStart ? "rounded-t-sm" : ""}`}
                    >
                      {b ? (
                        b.isStart ? (
                          <>
                            <span className="block truncate font-semibold">{b.source === "blocked" ? `⛔ ${b.note ?? "Blocked"}` : b.name}</span>
                            <span className="block truncate opacity-70">{b.source === "blocked" ? rangeLabel(b.startHour, b.hours) : `${rupees(b.amount)} · ${b.payment.status === "paid" ? "paid" : "due"}`}</span>
                          </>
                        ) : (
                          <span className="opacity-40">↳</span>
                        )
                      ) : (
                        !s.past && (
                          <span className="text-ink/35">
                            {rupees(s.price)}
                            {s.peak && " 🔥"}
                          </span>
                        )
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* modal */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            >
              {modal.kind === "new" ? (
                <>
                  <p className="text-sm text-ink/55">{modal.courtName} · {longDate(date)}</p>
                  <h2 className="font-display text-2xl font-bold">{rangeLabel(modal.hour, hours)}</h2>
                  <div className="mt-4 flex rounded-2xl bg-ink/5 p-1 text-sm font-semibold">
                    {(["walkin", "block"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)} className="relative flex-1 rounded-xl py-2">
                        {mode === m && <motion.span layoutId="m-mode" className="absolute inset-0 rounded-xl bg-ink" />}
                        <span className={`relative ${mode === m ? "text-cream" : "text-ink/60"}`}>{m === "walkin" ? "🧍 Walk-in" : "⛔ Block"}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span>Hours</span>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: modal.free }, (_, k) => k + 1).map((n) => (
                        <button key={n} onClick={() => setHours(n)} className={`h-9 w-9 rounded-xl font-semibold ${hours === n ? "bg-ink text-cream" : "bg-ink/5"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  {mode === "walkin" ? (
                    <div className="mt-3 space-y-2">
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" className="w-full rounded-2xl border-2 border-ink/10 px-4 py-2.5 outline-none focus:border-saffron" />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Phone (optional)" className="w-full rounded-2xl border-2 border-ink/10 px-4 py-2.5 outline-none focus:border-saffron" />
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="accent-saffron" /> Paid at counter</label>
                    </div>
                  ) : (
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="mt-3 w-full rounded-2xl border-2 border-ink/10 px-4 py-2.5 outline-none focus:border-saffron" />
                  )}
                  <button onClick={saveNew} className="btn-primary mt-4 w-full">{mode === "walkin" ? "Add walk-in" : "Block slot"}</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink/55">{modal.courtName} · {longDate(date)} · {rangeLabel(modal.b.startHour, modal.b.hours)}</p>
                  <h2 className="font-display text-2xl font-bold">{modal.b.source === "blocked" ? `⛔ ${modal.b.note ?? "Blocked"}` : modal.b.name}</h2>
                  {modal.b.source !== "blocked" && (
                    <div className="mt-3 space-y-1 text-sm">
                      {modal.b.phone && <p>📞 <a href={`tel:${modal.b.phone}`} className="underline">{modal.b.phone}</a></p>}
                      <p>💰 {rupees(modal.b.amount)} · {modal.b.payment.mode === "online" ? "online" : "at venue"} · <b>{modal.b.payment.status}</b></p>
                      <p>👥 {modal.b.players} player{modal.b.players > 1 ? "s" : ""} · {modal.b.source === "app" ? "booked on Nukkad" : "walk-in"} · {modal.b.status}</p>
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {modal.b.source !== "blocked" && modal.b.status === "confirmed" && (
                      <>
                        <button onClick={() => setStatus(modal.b, "completed")} className="rounded-2xl bg-mint py-3 font-semibold">✓ Played</button>
                        <button onClick={() => setStatus(modal.b, "no_show")} className="rounded-2xl bg-chili/10 py-3 font-semibold text-chili">No-show</button>
                      </>
                    )}
                    {modal.b.status !== "cancelled" && modal.b.status !== "completed" && (
                      <button onClick={() => setStatus(modal.b, "cancelled")} className="col-span-2 rounded-2xl bg-ink/5 py-3 font-semibold">
                        {modal.b.source === "blocked" ? "Unblock" : "Cancel & free slot"}
                      </button>
                    )}
                  </div>
                </>
              )}
              {err && <p className="mt-3 text-sm text-chili">{err}</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-ink px-5 py-3 text-sm text-cream shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
