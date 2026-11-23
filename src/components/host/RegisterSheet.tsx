"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Tournament } from "@/lib/host";
import { pay, rupees, type PaymentOrder } from "@/lib/pay";

type Player = { name: string; phone: string };

/** Bottom sheet: team name + players, then pay the entry fee (mock or Razorpay). */
export function RegisterSheet({ t, open, onClose, onDone }: { t: Tournament; open: boolean; onClose: () => void; onDone: () => void }) {
  return <AnimatePresence>{open && <Sheet t={t} onClose={onClose} onDone={onDone} />}</AnimatePresence>;
}

function Sheet({ t, onClose, onDone }: { t: Tournament; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<Player[]>(() => Array.from({ length: t.teamSize }, () => ({ name: "", phone: "" })));
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const [err, setErr] = useState<string | null>(null);

  const setPlayer = (i: number, p: Partial<Player>) => setPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const submit = async () => {
    setErr(null);
    const filled = players.filter((p) => p.name.trim());
    if (filled.length < t.teamSize) return setErr(`Add at least ${t.teamSize} player${t.teamSize > 1 ? "s" : ""}`);
    setStep("paying");
    try {
      const r = await api<{ team: { _id: string; paid: boolean }; order?: PaymentOrder }>(`/api/host/tournaments/${t.slug}/register`, {
        body: { teamName: name, players: filled.map((p) => ({ name: p.name.trim(), phone: p.phone.trim() || undefined })) },
      });
      if (r.order) {
        const proof = await pay(r.order, { name: t.title, description: `Entry fee for ${name}` });
        await api(`/api/host/tournaments/${t.slug}/teams/${r.team._id}/confirm`, { body: { proof } });
      }
      setStep("done");
      setTimeout(onDone, 1400);
    } catch (e) {
      setErr((e as ApiError).message);
      setStep("form");
    }
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label={`Register for ${t.title}`}
        className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-6 pb-10 shadow-2xl sm:bottom-6 sm:rounded-3xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
        {step === "done" ? (
          <div className="py-10 text-center">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className="text-7xl">
              {t.emoji}
            </motion.div>
            <p className="mt-4 font-display text-3xl font-extrabold">{name} is in!</p>
            <p className="mt-1 text-ink/60">You earned Nukkad Points. See you on match day.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-saffron-deep">Register a team</p>
            <h2 className="font-display text-3xl font-extrabold leading-tight">{t.title}</h2>
            <input
              required
              minLength={2}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              className="mt-5 w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-saffron"
            />
            <p className="mb-2 mt-5 text-sm font-semibold">
              Players <span className="font-normal text-ink/60">(min {t.teamSize}, captain first)</span>
            </p>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
                    <span className="grid w-8 shrink-0 place-items-center text-sm font-bold text-ink/60">{i + 1}</span>
                    <input value={p.name} onChange={(e) => setPlayer(i, { name: e.target.value })} placeholder="Name" className="min-w-0 flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-2 outline-none focus:border-saffron" />
                    <input value={p.phone} onChange={(e) => setPlayer(i, { phone: e.target.value })} inputMode="numeric" placeholder="Phone (optional)" className="w-36 rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron" />
                    {players.length > t.teamSize && (
                      <button type="button" onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))} className="px-1 text-ink/60 hover:text-chili" aria-label="Remove player">
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {players.length < t.teamSize + 4 && (
              <button type="button" onClick={() => setPlayers((ps) => [...ps, { name: "", phone: "" }])} className="mt-2 text-sm font-semibold text-saffron-deep">
                + Add substitute
              </button>
            )}
            <button disabled={step === "paying"} className="btn-primary mt-6 w-full">
              {step === "paying" ? "Processing…" : t.entryFee ? `Pay ${rupees(t.entryFee)} & register` : "Register for free"}
            </button>
            {err && <p className="mt-3 text-sm font-medium text-chili-deep">{err}</p>}
          </form>
        )}
      </motion.div>
    </>
  );
}
