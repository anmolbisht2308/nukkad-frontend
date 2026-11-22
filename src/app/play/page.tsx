import type { Metadata } from "next";
import PlayHome from "@/components/play/PlayHome";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Book turfs & courts in ${BRAND.city} · ${BRAND.name}`,
  description: `Box cricket, football, pickleball and badminton in ${BRAND.city}. See free slots, book in 3 taps, split with friends or join an open game.`,
};

export default function PlayPage() {
  return <PlayHome />;
}
