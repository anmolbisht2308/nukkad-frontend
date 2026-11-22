import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TournamentView from "@/components/host/TournamentView";
import { API_URL } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import type { TournamentDetail } from "@/lib/host";

async function load(slug: string): Promise<TournamentDetail | null> {
  const res = await fetch(`${API_URL}/api/host/tournaments/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function generateMetadata({ params }: PageProps<"/tournaments/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug).catch(() => null);
  if (!d) return { title: BRAND.name };
  const t = d.tournament;
  return { title: `${t.title} · ${BRAND.name}`, description: `${t.sport} ${t.format} in ${BRAND.city}. ${t.teamsCount}/${t.maxTeams} teams.${t.prizes[0] ? ` Prize: ${t.prizes[0]}.` : ""}` };
}

async function Content({ params }: { params: PageProps<"/tournaments/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return <TournamentView initial={d} />;
}

export default function TournamentPage({ params }: PageProps<"/tournaments/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse bg-ink/5" />}>
      <Content params={params} />
    </Suspense>
  );
}
