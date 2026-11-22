"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api, type Business } from "@/lib/api";
import { useAuth } from "../Auth";
import { toast } from "@/components/ui/Toast";

type Shown = { code: string; title: string; business: Pick<Business, "name" | "emoji" | "theme"> };
type Ctx = { claim: (dealId: string, title: string, business: Shown["business"]) => void; show: (s: Shown) => void };

const CouponCtx = createContext<Ctx | null>(null);
export const useCoupon = () => useContext(CouponCtx)!;

export function CouponProvider({ children }: { children: ReactNode }) {
  const { withLogin } = useAuth();
  const [shown, setShown] = useState<Shown | null>(null);

  const claim: Ctx["claim"] = (dealId, title, business) =>
    withLogin(async () => {
      try {
        const r = await api<{ claim: { code: string } }>(`/api/deals/${dealId}/claim`, { method: "POST" });
        setShown({ code: r.claim.code, title, business });
      } catch (e) {
        toast.error(e, { emoji: "🎟️" });
      }
    });

  return (
    <CouponCtx.Provider value={{ claim, show: setShown }}>
      {children}
      <AnimatePresence>
        {shown && (
          <>
            <motion.div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShown(null)} />
            <motion.div
              className="fixed inset-x-4 top-1/2 z-[86] mx-auto max-w-sm -translate-y-1/2"
              initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="relative p-6 text-white" style={{ background: `linear-gradient(135deg, ${shown.business.theme.from}, ${shown.business.theme.to})` }}>
                  <p className="text-sm opacity-80">{shown.business.emoji} {shown.business.name}</p>
                  <p className="mt-1 font-display text-2xl font-bold leading-tight">{shown.title}</p>
                  {/* ticket notches */}
                  <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-black/60" />
                  <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-black/60" />
                </div>
                <div className="flex flex-col items-center border-t-2 border-dashed border-ink/10 p-6">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                    <QRCodeSVG value={`NUKKAD:${shown.code}`} size={168} level="M" />
                  </motion.div>
                  <p className="mt-4 font-mono text-3xl font-bold tracking-[0.3em]">{shown.code}</p>
                  <p className="mt-1 text-center text-sm text-ink/60">Show this at the counter. Saved in My coupons.</p>
                  <button onClick={() => setShown(null)} className="btn-primary mt-5 w-full">Done</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CouponCtx.Provider>
  );
}
