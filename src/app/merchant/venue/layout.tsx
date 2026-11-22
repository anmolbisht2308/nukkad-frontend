import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Venue calendar · ${BRAND.name}` };

// The calendar reads "today" (IST) while rendering, so render it per request rather than at build time.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="mx-auto mt-32 h-96 max-w-5xl animate-pulse rounded-3xl bg-ink/5" />}>{children}</Suspense>;
}
