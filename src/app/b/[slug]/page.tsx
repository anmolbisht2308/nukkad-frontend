import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BusinessView from "@/components/business/BusinessView";
import { API_URL, type Business, type Deal } from "@/lib/api";
import { BRAND } from "@/lib/brand";

type Data = { business: Business; deals: Deal[] };

async function load(slug: string): Promise<Data | null> {
  const res = await fetch(`${API_URL}/api/businesses/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug).catch(() => null);
  if (!d) return { title: BRAND.name };
  return { title: `${d.business.name}, ${d.business.area} · ${BRAND.name}`, description: d.business.tagline };
}

async function Content({ params }: { params: PageProps<"/b/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return <BusinessView business={d.business} deals={d.deals} />;
}

export default function BusinessPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse bg-ink/5" />}>
      <Content params={params} />
    </Suspense>
  );
}
