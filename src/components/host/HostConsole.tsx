"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, type Business, type Event } from "@/lib/api";
import { whenIST } from "@/lib/format";
import { roundName, SPORTS, sportEmoji, statusLabel, type Match, type Tournament, type TournamentDetail, type TournamentStatus } from "@/lib/host";
import { useAuth } from "../Auth";
import { toast } from "@/components/ui/Toast";

const input = "w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-2.5 outline-none focus:border-saffron";

function Stepper({ v, set, label }: { v: number; set: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-xl bg-ink/5 ring-saffron focus-within:ring-2">
      <button type="button" onClick={() => set(Math.max(0, v - 1))} className="px-2.5 py-1.5 text-lg leading-none" aria-label={`${label}: minus one`}>−</button>
      <input aria-label={label} value={v} onChange={(e) => set(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} inputMode="numeric" className="w-12 bg-transparent text-center font-mono font-bold tabular-nums outline-none" />
      <button type="button" onClick={() => set(v + 1)} className="px-2.5 py-1.5 text-lg leading-none" aria-label={`${label}: plus one`}>+</button>
    </div>
  );
}

/** Score entry for one match. Keyed by its saved state, so it resets after each save. */
function ScoreRow({ m, onSaved }: { m: Match; onSaved: () => void }) {
  const [a, setA] = useState(m.scoreA ?? 0);
  const [b, setB] = useState(m.scoreB ?? 0);
  const [busy, setBusy] = useState(false);
  const save = async (status: Match["status"]) => {
    setBusy(true);
    try {
      await api(`/api/host/matches/${m._id}/score`, { body: { scoreA: a, scoreB: b, status } });
      onSaved();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`rounded-2xl p-3 ${m.status === "live" ? "bg-chili/10 ring-1 ring-chili/30" : m.status === "done" ? "bg-ink/[0.03]" : "bg-white ring-1 ring-ink/5"}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <span className="truncate text-sm font-semibold">{m.teamA?.name}</span>
        <Stepper v={a} set={setA} label={`${m.teamA?.name ?? "Team A"} score`} />
        <span className="truncate text-sm font-semibold">{m.teamB?.name}</span>
        <Stepper v={b} set={setB} label={`${m.teamB?.name ?? "Team B"} score`} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-ink/60">
          {m.status === "live" ? "🔴 live" : m.status === "done" ? `✓ ${m.winner?.name ?? "draw"}` : "scheduled"} {m.court && `· ${m.court}`}
        </span>
        <div className="flex gap-1.5">
          <button disabled={busy} onClick={() => save("live")} className="rounded-lg bg-chili-deep px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Live</button>
          <button disabled={busy} onClick={() => save("done")} className="rounded-lg bg-ink px-3 py-1 text-xs font-semibold text-cream disabled:opacity-50">Final</button>
        </div>
      </div>
    </div>
  );
}

function CreateTournament({ onCreated }: { onCreated: (slug: string) => void }) {
  const [venues, setVenues] = useState<Business[]>([]);
  const [f, setF] = useState({ title: "", sport: "cricket", format: "knockout", startsAt: "", entryFee: 500, teamSize: 6, maxTeams: 8, prizes: "", rules: "", venueId: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ items: Business[] }>("/api/businesses?kind=sports_venue", { auth: false }).then((r) => setVenues(r.items)).catch(() => {});
  }, []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await api<{ tournament: Tournament }>("/api/host/tournaments", {
            body: {
              title: f.title,
              sport: f.sport,
              format: f.format,
              startsAt: new Date(f.startsAt).toISOString(),
              entryFee: f.entryFee,
              teamSize: f.teamSize,
              maxTeams: f.maxTeams,
              prizes: f.prizes.split(",").map((s) => s.trim()).filter(Boolean),
              rules: f.rules || undefined,
              venueId: f.venueId || undefined,
            },
          });
          set({ title: "", prizes: "", rules: "" });
          onCreated(r.tournament.slug);
          toast.success("Tournament created", { emoji: "🏆", description: "Registrations are open.", celebrate: true });
        } catch (x) {
          toast.error(x);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input required minLength={3} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Tournament name, e.g. Winter Box Cricket Cup" className={`${input} sm:col-span-2`} />
      <select aria-label="Sport" value={f.sport} onChange={(e) => set({ sport: e.target.value })} className={input}>
        {SPORTS.map((s) => (
          <option key={s} value={s}>{sportEmoji[s]} {s[0].toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      <select aria-label="Format" value={f.format} onChange={(e) => set({ format: e.target.value })} className={input}>
        <option value="knockout">Knockout (bracket)</option>
        <option value="league">League (round robin)</option>
      </select>
      <label className="text-xs font-semibold text-ink/60">
        Starts
        <input
          required
          type="datetime-local"
          // earliest pickable start is "now" in the browser's local time; set on focus so prerendering stays static
          onFocus={(e) => (e.currentTarget.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16))}
          value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={`${input} mt-1 font-normal text-ink`} />
      </label>
      <label className="text-xs font-semibold text-ink/60">
        Venue
        <select value={f.venueId} onChange={(e) => set({ venueId: e.target.value })} className={`${input} mt-1 font-normal text-ink`}>
          <option value="">Other / not listed</option>
          {venues.map((v) => (
            <option key={v._id} value={v._id}>{v.emoji} {v.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink/60">
        Entry fee per team (₹)
        <input type="number" min={0} value={f.entryFee} onChange={(e) => set({ entryFee: Number(e.target.value) })} className={`${input} mt-1 font-normal text-ink`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-ink/60">
          Players / team
          <input type="number" min={1} max={15} value={f.teamSize} onChange={(e) => set({ teamSize: Number(e.target.value) })} className={`${input} mt-1 font-normal text-ink`} />
        </label>
        <label className="text-xs font-semibold text-ink/60">
          Max teams
          <input type="number" min={2} max={64} value={f.maxTeams} onChange={(e) => set({ maxTeams: Number(e.target.value) })} className={`${input} mt-1 font-normal text-ink`} />
        </label>
      </div>
      <input value={f.prizes} onChange={(e) => set({ prizes: e.target.value })} placeholder="Prizes, comma separated (₹10,000 + trophy, ₹3,000 runners-up)" className={`${input} sm:col-span-2`} />
      <textarea value={f.rules} onChange={(e) => set({ rules: e.target.value })} rows={3} placeholder="Rules (overs, timings, ball type…)" className={`${input} sm:col-span-2`} />
      <button disabled={busy} className="btn-primary sm:col-span-2">{busy ? "Creating…" : "Create tournament"}</button>
    </form>
  );
}

function StallGrid() {
  const [events, setEvents] = useState<Event[]>([]);
  const [f, setF] = useState({ slug: "", rows: 2, cols: 6, price: 1500, size: "small" });
  useEffect(() => {
    api<{ events: Event[] }>("/api/events?when=week", { auth: false })
      .then((r) => {
        setEvents(r.events);
        setF((x) => ({ ...x, slug: x.slug || r.events[0]?.slug || "" }));
      })
      .catch(() => {});
  }, []);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_repeat(4,1fr)_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await api<{ stalls: number }>(`/api/host/events/${f.slug}/stalls`, { body: { rows: f.rows, cols: f.cols, price: f.price, size: f.size } });
          toast.success(`${r.stalls} stalls are live`, { emoji: "🍢", description: "Merchants can book them on the event page." });
        } catch (x) {
          toast.error(x);
        }
      }}
    >
      <select aria-label="Event" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className={input}>
        {events.map((ev) => (
          <option key={ev._id} value={ev.slug}>{ev.emoji} {ev.title}</option>
        ))}
      </select>
      <input type="number" min={1} max={8} value={f.rows} onChange={(e) => setF({ ...f, rows: Number(e.target.value) })} title="Rows" aria-label="Rows" className={input} />
      <input type="number" min={1} max={12} value={f.cols} onChange={(e) => setF({ ...f, cols: Number(e.target.value) })} title="Stalls per row" aria-label="Stalls per row" className={input} />
      <input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} title="Price (₹)" aria-label="Stall price in rupees" className={input} />
      <select aria-label="Stall size" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} className={input}>
        <option value="small">Small</option>
        <option value="large">Large</option>
      </select>
      <button disabled={!f.slug} className="btn-primary">Create</button>
      <p className="text-xs text-ink/60 sm:col-span-6">Rows × stalls per row at ₹ price each. Locked once any stall is booked.</p>
    </form>
  );
}

export default function HostConsole() {
  const { user, ready, withLogin } = useAuth();
  const [mine, setMine] = useState<Tournament[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [tick, setTick] = useState(0);
  const allowed = user?.role === "organizer" || user?.role === "merchant" || user?.role === "admin";
  // event stall layouts are set up by Nukkad admins (events have no owner account yet)
  const canStalls = user?.role === "admin";


  useEffect(() => {
    if (!allowed) return;
    api<{ organising: Tournament[] }>("/api/host/mine")
      .then((r) => {
        setMine(r.organising);
        setSel((s) => s ?? r.organising[0]?.slug ?? null);
      })
      .catch(() => {});
  }, [allowed, tick]);

  useEffect(() => {
    if (!sel || !allowed) return;
    api<TournamentDetail>(`/api/host/tournaments/${sel}`).then(setDetail).catch(() => {});
  }, [sel, allowed, tick]);

  const reload = () => setTick((x) => x + 1);
  const t = detail?.tournament.slug === sel ? detail?.tournament : undefined;
  const playable = (detail?.matches ?? []).filter((m) => !m.bye && m.teamA && m.teamB);
  const rounds = detail?.rounds ?? 0;

  if (ready && !user)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">Organiser console</h1>
        <p className="mt-2 text-ink/60">Run tournaments, enter live scores and sell event stalls.</p>
        <button onClick={() => withLogin()} className="btn-primary mt-6">Log in</button>
      </main>
    );
  if (ready && user && !allowed)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <h1 className="font-display text-4xl font-extrabold">Organiser access needed</h1>
        <p className="mt-2 text-ink/60">Venue owners and verified organisers can host tournaments. Join the list on the home page as an organiser and we&apos;ll set you up.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <p className="text-sm font-medium text-ink/60">Organiser console</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Run your tournaments</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">My tournaments</p>
          {mine.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-ink/60">None yet. Create one below.</p>}
          {mine.map((x) => (
            <button key={x._id} onClick={() => setSel(x.slug)} className={`relative w-full overflow-hidden rounded-2xl p-3 text-left transition ${sel === x.slug ? "bg-ink text-cream" : "bg-white hover:bg-white/70"}`}>
              <p className="truncate font-semibold">{x.emoji} {x.title}</p>
              <p className={`text-xs ${sel === x.slug ? "text-cream/60" : "text-ink/60"}`}>{statusLabel[x.status]} · {x.teamsCount}/{x.maxTeams} teams</p>
            </button>
          ))}
        </aside>

        <section className="min-w-0 space-y-6">
          {t && detail && (
            <motion.div key={t._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">{t.emoji} {t.title}</h2>
                  <p className="text-sm text-ink/60">{whenIST(t.startsAt)} · {t.format} · {detail.teams.length} confirmed teams</p>
                </div>
                <Link href={`/tournaments/${t.slug}`} className="rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold">Public page →</Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(["registration", "live", "completed"] as TournamentStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      try {
                        await api(`/api/host/tournaments/${t.slug}/status`, { body: { status: s } });
                        reload();
                      } catch (x) {
                        toast.error(x);
                      }
                    }}
                    className={`relative rounded-full px-3 py-1.5 text-sm font-semibold ${t.status === s ? "text-cream" : "text-ink/60"}`}
                  >
                    {t.status === s && <motion.span layoutId="host-status" className="absolute inset-0 rounded-full bg-ink" />}
                    <span className="relative">{statusLabel[s]}</span>
                  </button>
                ))}
                <span className="mx-2 h-6 w-px bg-ink/10" />
                <label className="flex items-center gap-1.5 text-sm text-ink/60">
                  <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="accent-saffron" /> Random draw
                </label>
                <button
                  onClick={async () => {
                    try {
                      const r = await api<{ matches: number }>(`/api/host/tournaments/${t.slug}/fixtures`, { body: { shuffle } });
                      toast.success(`${r.matches} fixtures generated`, { emoji: "📋" });
                      reload();
                    } catch (x) {
                      toast.error(x);
                    }
                  }}
                  className="rounded-xl bg-saffron-deep px-4 py-2 text-sm font-semibold text-white"
                >
                  {detail.matches.length ? "Regenerate fixtures" : "Generate fixtures"}
                </button>
              </div>

              {playable.length > 0 && (
                <div className="mt-6 space-y-5">
                  {Array.from({ length: rounds }, (_, i) => playable.filter((m) => m.round === i + 1)).map((ms, i) =>
                    ms.length ? (
                      <div key={i}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/60">{roundName(i + 1, rounds, t.format)}</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {ms.map((m) => (
                            <ScoreRow key={`${m._id}-${m.scoreA}-${m.scoreB}-${m.status}-${m.teamA?._id}-${m.teamB?._id}`} m={m} onSaved={reload} />
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
              {detail.matches.length > 0 && playable.length === 0 && <p className="mt-4 text-sm text-ink/60">Waiting for earlier rounds to decide who plays.</p>}
            </motion.div>
          )}

          <div className="rounded-3xl bg-white p-6">
            <h2 className="mb-4 font-display text-2xl font-bold">Create a tournament</h2>
            <CreateTournament
             
              onCreated={(slug) => {
                setSel(slug);
                reload();
              }}
            />
          </div>

          {canStalls && (
            <div className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-2xl font-bold">Sell stalls at an event</h2>
              <p className="mb-4 text-sm text-ink/60">Food trucks and stalls book and pay on the event page.</p>
              <StallGrid />
            </div>
          )}
        </section>
      </div>

    </main>
  );
}
