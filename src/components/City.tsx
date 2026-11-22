"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type City = { slug: string; name: string; status: "live" | "launching" | "coming_soon"; places: number };

const FALLBACK: City = { slug: "bareilly", name: "Bareilly", status: "live", places: 0 };
const KEY = "nukkad.city";

type Ctx = { city: City; cities: City[]; setCity: (slug: string) => void };
const CityCtx = createContext<Ctx>({ city: FALLBACK, cities: [FALLBACK], setCity: () => {} });
export const useCity = () => useContext(CityCtx);

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([FALLBACK]);
  const [slug, setSlug] = useState("bareilly");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    api<{ cities: City[] }>("/api/cities", { auth: false })
      .then((r) => {
        setCities(r.cities);
        if (saved && r.cities.some((c) => c.slug === saved)) setSlug(saved);
      })
      .catch(() => {});
  }, []);

  const setCity = (s: string) => {
    setSlug(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  };

  const city = cities.find((c) => c.slug === slug) ?? FALLBACK;
  return <CityCtx.Provider value={{ city, cities, setCity }}>{children}</CityCtx.Provider>;
}
