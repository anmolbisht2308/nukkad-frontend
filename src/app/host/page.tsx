import type { Metadata } from "next";
import HostConsole from "@/components/host/HostConsole";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Organiser console · ${BRAND.name}` };

export default function HostPage() {
  return <HostConsole />;
}
