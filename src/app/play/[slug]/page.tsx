import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BookingView from "@/components/play/BookingView";
import { API_URL } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import type { Court, Venue } from "@/lib/play";

type Data = { venue: Venue; courts: Court[] };

async function load(slug: string): Promise<Data | null> {
  const res = await fetch(`${API_URL}/api/play/venues/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function generateMetadata({ params }: PageProps<"/play/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug).catch(() => null);
  if (!d) return { title: BRAND.name };
  return { title: `Book ${d.venue.name}, ${d.venue.area} · ${BRAND.name}`, description: d.venue.tagline };
}

async function Content({ params }: { params: PageProps<"/play/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return <BookingView venue={d.venue} courts={d.courts} />;
}

export default function VenuePage({ params }: PageProps<"/play/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[50vh] animate-pulse bg-ink/5" />}>
      <Content params={params} />
    </Suspense>
  );
}
