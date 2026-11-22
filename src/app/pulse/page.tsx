import type { Metadata } from "next";
import Pulse from "@/components/pulse/Pulse";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `What's on in ${BRAND.city} · ${BRAND.name}` };

export default function PulsePage() {
  return <Pulse />;
}
