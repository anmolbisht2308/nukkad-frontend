import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EventView from "@/components/host/EventView";
import { API_URL } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import type { EventDetail } from "@/lib/host";

async function load(slug: string): Promise<EventDetail | null> {
  const res = await fetch(`${API_URL}/api/host/events/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug).catch(() => null);
  if (!d) return { title: BRAND.name };
  return { title: `${d.event.title} · ${BRAND.name}`, description: d.event.description };
}

async function Content({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return <EventView initial={d} />;
}

export default function EventPage({ params }: PageProps<"/events/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse bg-ink/5" />}>
      <Content params={params} />
    </Suspense>
  );
}
