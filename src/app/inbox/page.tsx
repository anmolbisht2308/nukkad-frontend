"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Auth";
import { api } from "@/lib/api";
import { whenIST } from "@/lib/format";

type Note = { _id: string; type: string; title: string; body?: string; link?: string; emoji: string; read: boolean; createdAt: string };

export default function Inbox() {
  const { user, ready, withLogin } = useAuth();
  const [items, setItems] = useState<Note[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ items: Note[] }>("/api/me/notifications")
      .then((r) => {
        setItems(r.items);
        // mark as read after showing the unread state once
        if (r.items.some((n) => !n.read)) setTimeout(() => api("/api/me/notifications/read", { method: "POST" }).catch(() => {}), 1500);
      })
      .catch(() => setItems([]));
  }, [user]);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-28">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Notifications</h1>
      <p className="mt-1 text-ink/60">Trucks you follow going live, opening days, deals, bookings and points.</p>
      {ready && !user && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center">
          <p className="text-ink/60">Log in to see your alerts.</p>
          <button onClick={() => withLogin()} className="btn-primary mt-4">Log in</button>
        </div>
      )}
      {items?.length === 0 && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center">
          <p className="text-4xl">🔕</p>
          <p className="mt-2 text-ink/60">Nothing yet. Follow a food truck or tap Notify me on an opening to get alerts here.</p>
          <Link href="/pulse" className="btn-primary mt-4 inline-block">Explore</Link>
        </div>
      )}
      <div className="mt-8 space-y-2">
        <AnimatePresence>
          {items?.map((n, i) => (
            <motion.div key={n._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}>
              <Link href={n.link ?? "#"} className={`flex items-start gap-3 rounded-2xl p-4 transition hover:bg-white ${n.read ? "bg-white/50" : "bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.3)]"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-xl">{n.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{n.title}</p>
                  {n.body && <p className="text-sm text-ink/60">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-ink/60">{whenIST(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-chili" />}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
