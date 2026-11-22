import type { Business, Theme } from "./api";
import type { PaymentOrder } from "./pay";

export type Sport = "cricket" | "football" | "pickleball" | "badminton" | "tennis" | "basketball";

export const SPORT_META: Record<Sport, { label: string; emoji: string }> = {
  cricket: { label: "Box cricket", emoji: "🏏" },
  football: { label: "Football", emoji: "⚽" },
  pickleball: { label: "Pickleball", emoji: "🏓" },
  badminton: { label: "Badminton", emoji: "🏸" },
  tennis: { label: "Tennis", emoji: "🎾" },
  basketball: { label: "Basketball", emoji: "🏀" },
};

export type Court = {
  _id: string;
  business: string;
  name: string;
  sport: Sport;
  pricePerHour: number;
  peakPricePerHour: number;
  peakFrom: number;
  peakTo: number;
  openHour: number;
  closeHour: number;
  active: boolean;
};

export type Venue = Pick<Business, "_id" | "slug" | "name" | "emoji" | "theme" | "area" | "address" | "location" | "hours" | "tagline" | "rating" | "followersCount">;
export type VenueCard = Venue & { courts: Court[]; sports: Sport[]; fromPrice: number };

export type Slot = { hour: number; price: number; peak: boolean; status: "free" | "booked" | "past" };
export type Availability = { date: string; courts: { _id: string; name: string; sport: Sport; slots: Slot[] }[] };

export type Participant = { name: string; phone?: string; share: number; paid: boolean; user?: string };
export type Booking = {
  _id: string;
  court: { _id: string; name: string; sport: Sport };
  business: { _id: string; slug: string; name: string; emoji: string; theme: Theme; area: string; location?: { coordinates: [number, number] } };
  date: string;
  startHour: number;
  hours: number;
  amount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  source: "app" | "walkin" | "blocked";
  payment: { mode: "online" | "venue"; status: "unpaid" | "paid" | "refund_due"; orderId?: string; provider?: string };
  participants: Participant[];
  game?: { _id: string; spots: number; players: string[]; status: string; pricePerHead: number; skill: string } | null;
  startsAt: string;
  upcoming: boolean;
};
export type BookingResponse = { booking: { _id: string; status: string; amount: number; participants: Participant[] }; order?: PaymentOrder };

export type Game = {
  _id: string;
  sport: Sport;
  skill: "beginner" | "intermediate" | "advanced" | "any";
  spots: number;
  spotsLeft: number;
  playerCount: number;
  pricePerHead: number;
  note?: string;
  status: "open" | "full" | "cancelled";
  startsAt: string;
  joined: boolean;
  isHost: boolean;
  business: { slug: string; name: string; emoji: string; theme: Theme; area: string };
  court: { name: string };
  host: { _id: string; name?: string };
  booking?: { hours: number };
};

/* ---------- time helpers (all IST) ---------- */
const IST = 330 * 60_000;
export const istDate = (offsetDays = 0) => new Date(Date.now() + IST + offsetDays * 86_400_000).toISOString().slice(0, 10);

export const hourLabel = (h: number) => {
  const hh = h % 24;
  const suffix = hh < 12 ? "AM" : "PM";
  const n = hh % 12 === 0 ? 12 : hh % 12;
  return `${n} ${suffix}`;
};
export const rangeLabel = (start: number, hours: number) => `${hourLabel(start)} – ${hourLabel(start + hours)}`;

export const dateChip = (date: string) => {
  if (date === istDate()) return { top: "Today", bottom: dayNum(date) };
  if (date === istDate(1)) return { top: "Tmrw", bottom: dayNum(date) };
  const d = new Date(`${date}T00:00:00Z`);
  return { top: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }), bottom: dayNum(date) };
};
const dayNum = (date: string) => String(Number(date.slice(8, 10)));

export const longDate = (date: string) =>
  date === istDate()
    ? "Today"
    : date === istDate(1)
      ? "Tomorrow"
      : new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const nextDays = (n = 7) => Array.from({ length: n }, (_, i) => istDate(i));

export const gradient = (t: Theme) => ({ background: `linear-gradient(135deg, ${t.from}, ${t.to})` });

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
