import type { Metadata } from "next";
import TournamentList from "@/components/host/TournamentList";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Tournaments in ${BRAND.city} · ${BRAND.name}`, description: "Box cricket cups, pickleball leagues and football 7s. Register your team and follow live scores." };

export default function TournamentsPage() {
  return <TournamentList />;
}
