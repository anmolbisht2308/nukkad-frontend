"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CityPoster } from "./CityPoster";

const CityScene = dynamic(() => import("./CityScene"), { ssr: false });

/** Paints the lightweight poster instantly, then swaps in the three.js city once the page
    is idle (desktop) or on the first touch / scroll (phones), so it never delays first load.
    Skipped for reduced-motion and data-saver users. */
export function DeferredCity() {
  const [load, setLoad] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || nav.connection?.saveData || (nav.deviceMemory ?? 8) < 2) return;
    const go = () => setLoad(true);
    if (matchMedia("(pointer: fine)").matches) {
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
      const start = () => idle(go, { timeout: 2500 });
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
      return () => window.removeEventListener("load", start);
    }
    const events = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
    const once = () => {
      events.forEach((e) => window.removeEventListener(e, once));
      go();
    };
    events.forEach((e) => window.addEventListener(e, once, { passive: true, once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, once));
  }, []);

  return (
    <>
      <CityPoster />
      {load && (
        <div className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${shown ? "opacity-100" : "opacity-0"}`}>
          <CityScene onReady={() => setShown(true)} />
        </div>
      )}
    </>
  );
}
