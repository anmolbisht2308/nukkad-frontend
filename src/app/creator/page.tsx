"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Auth";
import { api, type Theme } from "@/lib/api";
import type { Creator } from "@/lib/social";
import { toast } from "@/components/ui/Toast";

type Campaign = {
  _id: string;
  brief: string;
  budget: number;
  status: "requested" | "accepted" | "declined" | "posted" | "completed";
  postUrl?: string;
  business: { slug: string; name: string; emoji: string; theme: Theme; area: string };
  deal?: { title: string; claimedCount: number; redeemedCount: number; limit: number };
};

const statusStyle: Record<Campaign["status"], string> = {
  requested: "bg-sun/30 text-amber-800",
  accepted: "bg-sky/20 text-sky-800",
  declined: "bg-ink/5 text-ink/60",
  posted: "bg-saffron/20 text-orange-800",
  completed: "bg-mint/25 text-emerald-800",
};

export default function CreatorStudio() {
  const { user, ready, withLogin } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ handle: "", name: "", platform: "instagram", followers: 1000, niches: "food", area: "", ratePerPost: 1000, bio: "" });
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = () =>
    api<{ creator: Creator | null; campaigns: Campaign[] }>("/api/creators/me").then((r) => {
      setCreator(r.creator);
      setCampaigns(r.campaigns);
      if (r.creator)
        setForm({ handle: r.creator.handle, name: r.creator.name, platform: r.creator.platform, followers: r.creator.followers, niches: r.creator.niches.join(", "), area: r.creator.area ?? "", ratePerPost: r.creator.ratePerPost, bio: r.creator.bio ?? "" });
      setLoaded(true);
    });

  useEffect(() => {
    if (user) load().catch(() => setLoaded(true));
  }, [user]);

  if (ready && !user)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <p className="text-5xl">📸</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">Creator studio</h1>
        <p className="mt-2 text-ink/60">Get paid by local businesses for posts your followers love.</p>
        <button onClick={() => withLogin()} className="btn-primary mt-6">Log in</button>
      </main>
    );

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await load();
      toast.success(ok);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-28">
      <p className="text-sm font-semibold uppercase tracking-widest text-saffron-deep">Creator studio</p>
      <h1 className="font-display text-5xl font-extrabold tracking-tight">{creator ? `@${creator.handle}` : "Set up your creator profile"}</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <form
          className="space-y-3 rounded-3xl bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () =>
                api("/api/creators/me", {
                  body: { ...form, followers: Number(form.followers), ratePerPost: Number(form.ratePerPost), niches: form.niches.split(",").map((s) => s.trim()).filter(Boolean), area: form.area || undefined, bio: form.bio || undefined },
                }),
              "Profile saved — you're in the marketplace"
            );
          }}
        >
          <h2 className="font-display text-2xl font-bold">Profile</h2>
          <div className="grid grid-cols-2 gap-3">
            <input required value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@handle" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display name" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
            <select aria-label="Platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none">
              {["instagram", "youtube", "facebook", "moj"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <input type="number" min={0} value={form.followers} onChange={(e) => setForm({ ...form, followers: Number(e.target.value) })} placeholder="Followers" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
            <input value={form.niches} onChange={(e) => setForm({ ...form, niches: e.target.value })} placeholder="food, cafes" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
            <input type="number" min={0} value={form.ratePerPost} onChange={(e) => setForm({ ...form, ratePerPost: Number(e.target.value) })} placeholder="₹ per post" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
          </div>
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area (e.g. Civil Lines)" className="w-full rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio" className="h-24 w-full rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
          <button className="btn-primary w-full">{creator ? "Save changes" : "Create profile"}</button>
        </form>

        <section>
          <h2 className="font-display text-2xl font-bold">Campaign requests</h2>
          {loaded && campaigns.length === 0 && <p className="mt-3 rounded-3xl bg-white p-6 text-ink/60">{creator ? "No requests yet. Businesses find you in the marketplace." : "Create your profile to start receiving requests."}</p>}
          <div className="mt-3 space-y-3">
            {campaigns.map((c, i) => (
              <motion.div key={c._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-3xl bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `linear-gradient(135deg, ${c.business.theme.from}, ${c.business.theme.to})` }}>{c.business.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-tight">{c.business.name}</p>
                    <p className="text-sm text-ink/60">₹{c.budget.toLocaleString("en-IN")} · {c.business.area}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[c.status]}`}>{c.status}</span>
                </div>
                <p className="mt-3 text-sm text-ink/70">{c.brief}</p>
                {c.deal && c.status !== "requested" && c.status !== "declined" && (
                  <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs">
                    Your tracked deal <b>{c.deal.title}</b>: {c.deal.claimedCount} claimed · <b>{c.deal.redeemedCount} walked in</b>
                  </p>
                )}
                {c.status === "requested" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => act(() => api(`/api/campaigns/${c._id}/respond`, { body: { accept: true } }), "Accepted! Your tracked deal is live")} className="btn-primary flex-1 py-2.5">Accept</button>
                    <button onClick={() => act(() => api(`/api/campaigns/${c._id}/respond`, { body: { accept: false } }), "Declined")} className="flex-1 rounded-2xl bg-ink/5 py-2.5 font-semibold">Decline</button>
                  </div>
                )}
                {c.status === "accepted" && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(() => api(`/api/campaigns/${c._id}/posted`, { body: { postUrl: urls[c._id] } }), "Marked as posted");
                    }}
                  >
                    <input required type="url" value={urls[c._id] ?? ""} onChange={(e) => setUrls({ ...urls, [c._id]: e.target.value })} placeholder="Link to your post" className="w-full rounded-2xl border-2 border-ink/10 px-4 py-2.5 outline-none" />
                    <button className="btn-primary py-2.5">Posted</button>
                  </form>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
