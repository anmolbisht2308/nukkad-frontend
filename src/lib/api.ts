export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
/** Uploaded files are either API-relative (/uploads/… in dev) or absolute (Cloud Storage in production). */
export const assetUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `${API_URL}${p}`);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = "nukkad.token";
export const getToken = () => {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean; init?: RequestInit } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = opts.auth === false ? null : getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    ...opts.init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong");
  return data as T;
}

/* ---------- Types mirrored from the API ---------- */
export type Theme = { from: string; to: string };
export type Business = {
  _id: string;
  slug: string;
  name: string;
  kind: "food_truck" | "street_stall" | "cafe" | "restaurant" | "bakery" | "shop" | "sports_venue";
  area: string;
  address?: string;
  tagline?: string;
  description?: string;
  tags: string[];
  priceLevel: number;
  emoji: string;
  photo?: string;
  theme: Theme;
  location: { coordinates: [number, number] };
  hours?: string;
  verified: boolean;
  opening: { status: "open" | "coming_soon"; date?: string; notifyCount: number };
  live?: { isLive: boolean; spot?: string; until?: string; location?: { coordinates: [number, number] } };
  followersCount: number;
  rating: { avg: number; count: number };
};
export type Deal = {
  _id: string;
  business: string | Pick<Business, "_id" | "slug" | "name" | "emoji" | "theme" | "area" | "kind">;
  title: string;
  description?: string;
  kind: string;
  value: number;
  limit: number;
  claimedCount: number;
  redeemedCount: number;
  endsAt: string;
};
export type Event = {
  _id: string;
  slug: string;
  title: string;
  kind: string;
  emoji: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  venue?: string;
  area?: string;
  organizer?: string;
  price: number;
  capacity: number;
  rsvpCount: number;
};
export type Claim = {
  _id: string;
  code: string;
  status: "claimed" | "redeemed";
  redeemedAt?: string;
  createdAt: string;
  deal: Pick<Deal, "_id" | "title" | "description" | "endsAt">;
  business: Pick<Business, "_id" | "slug" | "name" | "emoji" | "theme" | "area">;
};
export type User = { id: string; phone: string; name?: string; role: "user" | "merchant" | "organizer" | "admin" };
export type Feed = { liveTrucks: Business[]; newOpenings: Business[]; comingSoon: Business[]; deals: Deal[]; events: Event[] };

export const isLive = (b: Pick<Business, "live">) => !!b.live?.isLive && !!b.live.until && new Date(b.live.until) > new Date();
