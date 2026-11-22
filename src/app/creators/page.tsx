"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Auth";
import { useCity } from "@/components/City";
import { api, ApiError, type Business } from "@/lib/api";
import { compact } from "@/lib/format";
import type { Creator } from "@/lib/social";
import { toast } from "@/components/ui/Toast";


const NICHES = ["all", "food", "cafes", "desserts", "fitness", "running", "rides", "travel"];
const gradients = ["from-saffron to-chili", "from-sky to-[#7209b7]", "from-mint to-sky", "from-sun to-saffron", "from-chili to-[#7209b7]"];

function HireSheet({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const [biz, setBiz] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState(creator.ratePerPost);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<{ items: Business[] }>("/api/merchant/businesses")
      .then((r) => {
        setBiz(r.items);
        setBusinessId(r.items[0]?._id ?? "");
      })
      .catch(() => setErr("Only business accounts can hire creators."));
  }, []);
  return (
    <>
      <motion.div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-md rounded-t-3xl bg-cream p-6 pb-10 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        {state === "done" ? (
          <div className="py-6 text-center">
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-6xl">📣</motion.p>
            <p className="mt-3 font-display text-2xl font-bold">Request sent to @{creator.handle}</p>
            <p className="mt-1 text-sm text-ink/60">When they accept, a tracked deal goes live so you can see exactly how many customers their post brings.</p>
            <button onClick={onClose} className="btn-primary mt-5 w-full">Done</button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setState("busy");
              setErr(null);
              try {
                await api("/api/campaigns", { body: { businessId, creatorId: creator._id, brief, budget } });
                setState("done");
                toast.success(`Request sent to @${creator.handle}`, { emoji: "📸" });
              } catch (x) {
                setErr((x as ApiError).message);
                setState("idle");
              }
            }}
          >
            <h2 className="font-display text-2xl font-bold">Hire @{creator.handle}</h2>
            <p className="text-sm text-ink/60">Usually ₹{creator.ratePerPost.toLocaleString("en-IN")} per post</p>
            <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="mt-4 w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 outline-none">
              {biz.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <textarea required minLength={10} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What should they post? e.g. A reel of our new waffles on opening weekend" className="mt-3 h-28 w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 outline-none focus:border-saffron" />
            <label className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3">
              <span className="text-ink/60">₹</span>
              <input type="number" min={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full bg-transparent outline-none" />
            </label>
            <button disabled={state === "busy" || !businessId} className="btn-primary mt-4 w-full">{state === "busy" ? "Sending…" : "Send request"}</button>
            {err && <p className="mt-2 text-sm text-chili">{err}</p>}
          </form>
        )}
      </motion.div>
    </>
  );
}

export default function Creators() {
  const { user, withLogin } = useAuth();
  const { city } = useCity();
  const [niche, setNiche] = useState("all");
  const [items, setItems] = useState<Creator[] | null>(null);
  const [hire, setHire] = useState<Creator | null>(null);
  const isBiz = user?.role === "merchant" || user?.role === "admin";

  useEffect(() => {
    api<{ items: Creator[] }>(`/api/creators?city=${city.slug}${niche !== "all" ? `&niche=${niche}` : ""}`, { auth: false })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [niche, city.slug]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-saffron">Creator marketplace</p>
          <h1 className="mt-1 max-w-2xl font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Local voices people actually follow.</h1>
          <p className="mt-2 max-w-xl text-ink/60">Hire {city.name}&apos;s food bloggers, runners and riders. Every campaign comes with its own tracked deal, so you see the footfall, not just the likes.</p>
        </div>
        <Link href="/creator" className="rounded-2xl bg-ink px-5 py-3 font-semibold text-cream">Become a creator →</Link>
      </div>

      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-2">
        {NICHES.map((n) => (
          <button key={n} onClick={() => setNiche(n)} className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize">
            {niche === n && <motion.span layoutId="niche" className="absolute inset-0 rounded-full bg-ink" />}
            <span className={`relative ${niche === n ? "text-cream" : "text-ink/60"}`}>{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items?.length === 0 && <p className="text-ink/60">No creators here yet.</p>}
        {items?.map((c, i) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]"
          >
            <div className={`relative h-28 bg-gradient-to-br ${gradients[i % gradients.length]}`}>
              <div className="absolute -bottom-8 left-5 grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-lg transition-transform duration-500 group-hover:rotate-6">{c.emoji}</div>
              <span className="absolute right-4 top-4 rounded-full bg-white/25 px-2.5 py-1 text-xs font-semibold capitalize text-white backdrop-blur">{c.platform}</span>
            </div>
            <div className="p-5 pt-10">
              <p className="font-display text-xl font-bold">{c.name}</p>
              <p className="text-sm text-ink/60">@{c.handle} · {c.area}</p>
              <p className="mt-2 line-clamp-2 text-sm text-ink/70">{c.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.niches.map((n) => (
                  <span key={n} className="chip">#{n}</span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-cream py-2"><p className="font-display font-bold">{compact(c.followers)}</p><p className="text-[10px] text-ink/60">followers</p></div>
                <div className="rounded-xl bg-cream py-2"><p className="font-display font-bold">₹{compact(c.ratePerPost)}</p><p className="text-[10px] text-ink/60">per post</p></div>
                <div className="rounded-xl bg-cream py-2"><p className="font-display font-bold">{c.completed}</p><p className="text-[10px] text-ink/60">campaigns</p></div>
              </div>
              <button
                onClick={() => (user ? (isBiz ? setHire(c) : toast.info("Business accounts only", { description: "Log in with a business account to hire creators." })) : withLogin())}
                className="btn-primary mt-4 w-full"
              >
                Hire for a campaign
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>{hire && <HireSheet creator={hire} onClose={() => setHire(null)} />}</AnimatePresence>
    </main>
  );
}
