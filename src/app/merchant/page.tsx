"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/Auth";
import Link from "next/link";
import { api, assetUrl, ApiError, isLive, type Business, type Deal } from "@/lib/api";
import { untilIST, whenIST } from "@/lib/format";
import { toast } from "@/components/ui/Toast";

type CampaignRow = {
  _id: string;
  status: string;
  budget: number;
  business: { name: string; emoji: string };
  creator: { handle: string; followers: number; emoji: string };
  deal?: { claimedCount: number; redeemedCount: number };
};

/** Downscale on the phone before upload: max 1600px, JPEG ~0.82. */
async function toDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

type Stats = { followers: number; notify: number; claimed: number; redeemed: number; conversion: number; deals: Deal[]; recent: { _id: string; code: string; redeemedAt: string; deal: { title: string } }[] };

// Common parking spots; "Use my location" uses the phone's GPS instead.
const SPOTS: { label: string; c: [number, number] }[] = [
  { label: "Civil Lines market gate", c: [79.4205, 28.3592] },
  { label: "Rajendra Nagar main road", c: [79.4418, 28.3745] },
  { label: "DD Puram chauraha", c: [79.4302, 28.3702] },
  { label: "Pilibhit Bypass", c: [79.4561, 28.3856] },
  { label: "Model Town", c: [79.4395, 28.3801] },
  { label: "Gandhi Udyan gate", c: [79.4262, 28.3626] },
];

function Stat({ n, label, accent }: { n: number | string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${accent ? "bg-ink text-cream" : "bg-white"}`}>
      <p className="font-display text-4xl font-extrabold">{n}</p>
      <p className={`text-sm ${accent ? "text-cream/60" : "text-ink/60"}`}>{label}</p>
    </div>
  );
}

export default function Merchant() {
  const { user, ready, withLogin } = useAuth();
  const [items, setItems] = useState<Business[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [code, setCode] = useState("");
  const [redeem, setRedeem] = useState<{ ok: boolean; msg: string } | null>(null);
  const [spot, setSpot] = useState(SPOTS[0].label);
  const [hours, setHours] = useState(4);
  const [deal, setDeal] = useState({ title: "", description: "", limit: 100, days: 7 });
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const biz = items.find((b) => b._id === sel);
  const allowed = user?.role === "merchant" || user?.role === "admin";

  const loadAll = useCallback(async () => {
    const r = await api<{ items: Business[] }>("/api/merchant/businesses");
    setItems(r.items);
    setSel((s) => s ?? r.items[0]?._id ?? null);
  }, []);

  const loadStats = useCallback(async (id: string) => setStats(await api<Stats>(`/api/merchant/businesses/${id}/stats`)), []);

  useEffect(() => {
    if (!allowed) return;
    api<{ items: Business[] }>("/api/merchant/businesses")
      .then((r) => {
        setItems(r.items);
        setSel((s) => s ?? r.items[0]?._id ?? null);
      })
      .catch(() => {});
  }, [allowed]);
  useEffect(() => {
    if (!allowed) return;
    api<{ items: CampaignRow[] }>("/api/merchant-campaigns").then((r) => setCampaigns(r.items)).catch(() => {});
  }, [allowed]);
  useEffect(() => {
    if (!sel || !allowed) return;
    api<Stats>(`/api/merchant/businesses/${sel}/stats`).then(setStats).catch(() => {});
  }, [sel, allowed]);


  const goLive = async (coords?: [number, number]) => {
    if (!biz) return;
    const c = coords ?? SPOTS.find((s) => s.label === spot)!.c;
    await api(`/api/merchant/businesses/${biz._id}/live`, { body: { lng: c[0], lat: c[1], spot, hours } });
    await loadAll();
    toast.success("You're live!", { emoji: "📍", description: "Followers got a ping with where you are." });
  };

  const useGps = () =>
    navigator.geolocation.getCurrentPosition(
      (p) => goLive([p.coords.longitude, p.coords.latitude]),
      () => toast.error("Couldn't get your location", { description: "Pick a spot from the list instead." })
    );

  if (ready && !user)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <h1 className="font-display text-4xl font-extrabold">Business dashboard</h1>
        <p className="mt-2 text-ink/60">Log in with your business number.</p>
        <button onClick={() => withLogin()} className="btn-primary mt-6">Log in</button>
      </main>
    );
  if (ready && user && !allowed)
    return (
      <main className="mx-auto max-w-md px-5 pt-36 text-center">
        <h1 className="font-display text-4xl font-extrabold">Not a business account</h1>
        <p className="mt-2 text-ink/60">This number isn&apos;t linked to a business yet. Join the list on the home page and we&apos;ll set you up.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink/60">Business dashboard</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{biz ? `${biz.emoji} ${biz.name}` : "…"}</h1>
        </div>
        <select aria-label="Choose business" value={sel ?? ""} onChange={(e) => setSel(e.target.value)} className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-2.5 font-medium outline-none">
          {items.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat n={stats.redeemed} label="customers walked in" accent />
          <Stat n={stats.claimed} label="coupons claimed" />
          <Stat n={`${stats.conversion}%`} label="claim → visit" />
          <Stat n={biz?.opening.status === "coming_soon" ? stats.notify : stats.followers} label={biz?.opening.status === "coming_soon" ? "waiting for opening" : "followers"} />
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* redeem */}
        <section className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-2xl font-bold">Redeem a coupon</h2>
          <p className="text-sm text-ink/60">Type the 6-letter code from the customer&apos;s phone.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const r = await api<{ deal: { title: string } }>("/api/merchant/redeem", { body: { code } });
                setRedeem({ ok: true, msg: r.deal.title });
                setCode("");
                if (sel) loadStats(sel);
              } catch (x) {
                setRedeem({ ok: false, msg: (x as ApiError).message });
              }
            }}
          >
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" className="w-full rounded-2xl border-2 border-ink/10 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none focus:border-saffron" />
            <button disabled={code.length !== 6} className="btn-primary">Redeem</button>
          </form>
          <AnimatePresence mode="wait">
            {redeem && (
              <motion.div key={redeem.msg} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className={`mt-4 rounded-2xl p-4 ${redeem.ok ? "bg-mint/20" : "bg-chili/10"}`}>
                <p className="font-semibold">{redeem.ok ? "✅ Valid! Give the customer:" : "❌ Can't redeem"}</p>
                <p className="text-sm">{redeem.msg}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {stats && stats.recent.length > 0 && (
            <div className="mt-5 border-t border-ink/5 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/60">Recent</p>
              {stats.recent.slice(0, 5).map((r) => (
                <p key={r._id} className="flex justify-between py-1 text-sm">
                  <span className="truncate">{r.deal.title}</span>
                  <span className="shrink-0 text-ink/60">{whenIST(r.redeemedAt)}</span>
                </p>
              ))}
            </div>
          )}
        </section>

        {/* live location */}
        {biz && (biz.kind === "food_truck" || biz.kind === "street_stall") && (
          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-display text-2xl font-bold">Where are you parked?</h2>
            {isLive(biz) ? (
              <div className="mt-4 rounded-2xl bg-mint/15 p-4">
                <p className="flex items-center gap-2 font-semibold"><span className="live-dot" /> Live at {biz.live?.spot}</p>
                <p className="text-sm text-ink/60">{biz.live?.until && untilIST(biz.live.until)}</p>
                <button
                  onClick={async () => {
                    try {
                      await api(`/api/merchant/businesses/${biz._id}/live`, { method: "DELETE" });
                      await loadAll();
                      toast.info("Closed for today", { emoji: "🌙" });
                    } catch (x) {
                      toast.error(x);
                    }
                  }}
                  className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream"
                >
                  Close for today
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <select aria-label="Where are you parked" value={spot} onChange={(e) => setSpot(e.target.value)} className="w-full rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none">
                  {SPOTS.map((s) => (
                    <option key={s.label}>{s.label}</option>
                  ))}
                </select>
                <label className="flex items-center justify-between text-sm">
                  Serving for <span className="font-semibold">{hours} hours</span>
                </label>
                <input type="range" aria-label="Hours serving" min={1} max={10} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full accent-saffron" />
                <div className="flex gap-2">
                  <button onClick={() => goLive()} className="btn-primary flex-1">🚚 Go live here</button>
                  <button onClick={useGps} className="rounded-2xl bg-ink/5 px-4 font-semibold">📍 GPS</button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* photo */}
        {biz && (
          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-display text-2xl font-bold">Cover photo</h2>
            <p className="text-sm text-ink/60">Shown on your page and in the city feed.</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${biz.theme.from}, ${biz.theme.to})` }}>
                {biz.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(biz.photo)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-4xl">{biz.emoji}</span>
                )}
              </div>
              <label className="btn-primary cursor-pointer">
                {uploading ? "Uploading…" : biz.photo ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      await api(`/api/merchant/businesses/${biz._id}/photo`, { body: { dataUrl: await toDataUrl(f) } });
                      await loadAll();
                      toast.success("Cover photo updated", { emoji: "📸" });
                    } catch (x) {
                      toast.error(x);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          </section>
        )}

        {/* creator campaigns */}
        <section className="rounded-3xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Creator campaigns</h2>
            <Link href="/creators" className="text-sm font-semibold text-saffron-deep">Hire a creator →</Link>
          </div>
          {campaigns.length === 0 && <p className="mt-2 text-sm text-ink/60">No campaigns yet. Local creators post about you and you see exactly how many customers they bring.</p>}
          <div className="mt-3 divide-y divide-ink/5">
            {campaigns.map((c) => (
              <div key={c._id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-xl">{c.creator.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">@{c.creator.handle} <span className="font-normal text-ink/60">for {c.business.name}</span></p>
                  <p className="text-xs text-ink/60">₹{c.budget} · {c.deal ? `${c.deal.redeemedCount} walked in / ${c.deal.claimedCount} claimed` : ""}</p>
                </div>
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold capitalize">{c.status}</span>
                {c.status === "posted" && (
                  <button
                    onClick={async () => {
                      await api(`/api/campaigns/${c._id}/complete`, { method: "POST" });
                      const r = await api<{ items: CampaignRow[] }>("/api/merchant-campaigns");
                      setCampaigns(r.items);
                    }}
                    className="rounded-xl bg-ink px-3 py-1.5 text-xs font-semibold text-cream"
                  >
                    Mark done
                  </button>
                )}
              </div>
            ))}
          </div>
          {items.some((b) => b.kind === "sports_venue") && (
            <Link href="/merchant/venue" className="mt-4 block rounded-2xl bg-cream px-4 py-3 text-sm font-semibold">🏟️ Open the venue calendar →</Link>
          )}
        </section>

        {/* new deal */}
        {biz && (
          <section className="rounded-3xl bg-white p-6 md:col-span-2">
            <h2 className="font-display text-2xl font-bold">Create a deal</h2>
            <form
              className="mt-4 grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto]"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api(`/api/merchant/businesses/${biz._id}/deals`, { body: { ...deal, description: deal.description || undefined } });
                  setDeal({ title: "", description: "", limit: 100, days: 7 });
                  loadStats(biz._id);
                  toast.success("Deal is live", { emoji: "🎟️", description: "It's in the city feed and followers were notified." });
                } catch (x) {
                  toast.error(x);
                }
              }}
            >
              <input required value={deal.title} onChange={(e) => setDeal({ ...deal, title: e.target.value })} placeholder="e.g. Free chai with any roll" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
              <input value={deal.description} onChange={(e) => setDeal({ ...deal, description: e.target.value })} placeholder="Details (optional)" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none focus:border-saffron" />
              <input type="number" min={1} value={deal.limit} onChange={(e) => setDeal({ ...deal, limit: Number(e.target.value) })} title="How many coupons" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
              <input type="number" min={1} max={90} value={deal.days} onChange={(e) => setDeal({ ...deal, days: Number(e.target.value) })} title="Days it runs" className="rounded-2xl border-2 border-ink/10 px-4 py-3 outline-none" />
              <button className="btn-primary">Publish</button>
            </form>
            <p className="mt-2 text-xs text-ink/60">Limit = number of coupons · days = how long it runs</p>
            {stats && stats.deals.length > 0 && (
              <div className="mt-5 divide-y divide-ink/5">
                {stats.deals.map((d) => (
                  <div key={d._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{d.title}</span>
                    <span className="shrink-0 text-ink/60">{d.redeemedCount} used / {d.claimedCount} claimed / {d.limit}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

    </main>
  );
}
