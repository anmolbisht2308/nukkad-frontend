const IST = "Asia/Kolkata";

export const timeIST = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST });

export const dayIST = (d: string | Date) => {
  const date = new Date(d);
  const key = (x: Date) => x.toLocaleDateString("en-IN", { timeZone: IST });
  const now = new Date();
  if (key(date) === key(now)) return "Today";
  if (key(date) === key(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST });
};

export const whenIST = (d: string | Date) => `${dayIST(d)}, ${timeIST(d)}`;

export const untilIST = (d: string) => `till ${timeIST(d)}`;

export const kindLabel: Record<string, string> = {
  food_truck: "Food truck",
  street_stall: "Street stall",
  cafe: "Café",
  restaurant: "Restaurant",
  bakery: "Bakery",
  shop: "Shop",
  sports_venue: "Sports venue",
  run_club: "Run club",
  cycling: "Cycling",
  bike_ride: "Bike ride",
  food_fest: "Food fest",
  night_market: "Night market",
  tournament: "Tournament",
  trek: "Trek",
  meetup: "Meetup",
};

export const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export const mapsLink = ([lng, lat]: [number, number]) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
