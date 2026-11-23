import { expect, test } from "@playwright/test";
import { apiCall, freshPhone, istDate, login, tokenOf } from "./env";

/**
 * Server rules that the UI can't easily show: race conditions, brackets, permissions.
 * These only talk to the API, so they run once (desktop project).
 */
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "API checks run once"));

type T = { tournament: { slug: string; status: string; teamsCount: number; champion?: string }; teams: { _id: string; name: string; seed: number }[]; matches: Match[] };
type Match = { _id: string; round: number; order: number; status: string; bye?: boolean; teamA?: { _id: string; name: string }; teamB?: { _id: string; name: string }; winner?: { _id: string } };

const org = () => tokenOf("organiser");

async function newTournament(over: Record<string, unknown> = {}) {
  const r = await apiCall<{ tournament: { slug: string } }>("/api/host/tournaments", {
    token: org(),
    body: { title: `API Cup ${Date.now() % 1e6}`, sport: "football", format: "knockout", startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), entryFee: 0, teamSize: 1, maxTeams: 8, ...over },
  });
  expect(r.status).toBe(201);
  return r.data.tournament.slug;
}
const register = async (slug: string, name: string) =>
  apiCall<{ team: { _id: string }; order?: { orderId: string } }>(`/api/host/tournaments/${slug}/register`, {
    token: await login(freshPhone(), name),
    body: { teamName: name, players: [{ name }] },
  });
const get = async (slug: string) => (await apiCall<T>(`/api/host/tournaments/${slug}`)).data;
const score = (id: string, a: number, b: number, status = "done") => apiCall(`/api/host/matches/${id}/score`, { token: org(), body: { scoreA: a, scoreB: b, status } });

test("knockout with 6 teams: byes go to seeds 1 and 2, who sit in opposite halves", async () => {
  const slug = await newTournament();
  for (let i = 1; i <= 6; i++) expect((await register(slug, `Seed ${i}`)).status).toBe(201);
  expect((await apiCall(`/api/host/tournaments/${slug}/fixtures`, { token: org(), body: {} })).status).toBe(200);
  const d = await get(slug);
  const r1 = d.matches.filter((m) => m.round === 1).sort((a, b) => a.order - b.order);
  const byes = r1.filter((m) => m.bye).map((m) => m.teamA!.name).sort();
  expect(byes).toEqual(["Seed 1", "Seed 2"]);
  const half = (name: string) => (r1.findIndex((m) => m.teamA?.name === name || m.teamB?.name === name) < r1.length / 2 ? "top" : "bottom");
  expect(half("Seed 1")).not.toBe(half("Seed 2"));
});

test("registration closes once fixtures are out", async () => {
  const slug = await newTournament();
  await register(slug, "Early A");
  await register(slug, "Early B");
  await apiCall(`/api/host/tournaments/${slug}/fixtures`, { token: org(), body: {} });
  const late = await register(slug, "Late C");
  expect(late.status).toBe(409);
});

test("two captains racing for the last spot can't overfill a free tournament", async () => {
  const slug = await newTournament({ maxTeams: 2 });
  await register(slug, "First");
  const results = await Promise.all(["R1", "R2", "R3", "R4"].map((n) => register(slug, n)));
  expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  const d = await get(slug);
  expect(d.tournament.teamsCount).toBe(2);
  expect(d.teams).toHaveLength(2);
});

test("a double-tapped payment confirm only takes one spot", async () => {
  const slug = await newTournament({ entryFee: 300 });
  const token = await login(freshPhone(), "Payer");
  const reg = await apiCall<{ team: { _id: string }; order: { orderId: string } }>(`/api/host/tournaments/${slug}/register`, { token, body: { teamName: "Payers", players: [{ name: "P" }] } });
  expect(reg.status).toBe(201);
  const confirm = () => apiCall(`/api/host/tournaments/${slug}/teams/${reg.data.team._id}/confirm`, { token, body: { proof: { provider: "mock", orderId: reg.data.order.orderId } } });
  const rs = await Promise.all([confirm(), confirm(), confirm()]);
  expect(rs.some((r) => r.status === 200)).toBe(true);
  expect((await get(slug)).tournament.teamsCount).toBe(1);
});

test("scores: correcting the final after it ended changes the champion; same-winner fixes are accepted", async () => {
  const slug = await newTournament({ maxTeams: 4 });
  for (const n of ["A", "B", "C", "D"]) await register(slug, `Team ${n}`);
  await apiCall(`/api/host/tournaments/${slug}/fixtures`, { token: org(), body: {} });
  let d = await get(slug);
  const r1 = d.matches.filter((m) => m.round === 1);
  for (const m of r1) expect((await score(m._id, 2, 1)).status).toBe(200); // teamA wins each semi
  d = await get(slug);
  const final = d.matches.find((m) => m.round === 2)!;
  expect((await score(final._id, 3, 1)).status).toBe(200);
  d = await get(slug);
  expect(d.tournament.status).toBe("completed");
  expect(d.tournament.champion).toBe(final.teamA!._id);

  // organiser fixes a typo in a semi-final without changing who won: accepted
  expect((await score(r1[0]._id, 2, 0)).status).toBe(200);
  // and corrects the final the other way round: champion follows
  expect((await score(final._id, 1, 3)).status).toBe(200);
  d = await get(slug);
  expect(d.tournament.status).toBe("completed");
  expect(d.tournament.champion).toBe(final.teamB!._id);
});

test("tournament status only moves in sensible steps", async () => {
  const slug = await newTournament();
  const set = (status: string) => apiCall(`/api/host/tournaments/${slug}/status`, { token: org(), body: { status } });
  expect((await set("completed")).status).toBe(409); // can't jump from registration to completed
  expect((await set("live")).status).toBe(200);
  expect((await set("registration")).status).toBe(200); // nothing played yet, so it may reopen
});

test("organisers can't lay out stalls at events (admins only)", async () => {
  const r = await apiCall("/api/host/events/food-truck-friday/stalls", { token: org(), body: { rows: 1, cols: 1, price: 1 } });
  expect(r.status).toBe(403);
});

test("five people grabbing the same turf slot at once: exactly one gets it", async () => {
  const date = istDate(6);
  const a = await apiCall<{ courts: { _id: string; slots: { hour: number; status: string }[] }[] }>(`/api/play/venues/shuttle-house/availability?date=${date}`);
  const court = a.data.courts[0];
  const hour = court.slots.filter((s) => s.status === "free").at(-1)!.hour;
  const tokens = await Promise.all(Array.from({ length: 5 }, (_, i) => login(freshPhone(), `Racer ${i}`)));
  const rs = await Promise.all(tokens.map((token) => apiCall("/api/play/bookings", { token, body: { courtId: court._id, date, startHour: hour, hours: 1, payMode: "venue" } })));
  expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
  expect(rs.filter((r) => r.status === 409)).toHaveLength(4);
});

test("claiming the same deal twice returns the same coupon", async () => {
  const feed = await apiCall<{ deals: { _id: string }[] }>("/api/feed?when=week");
  const token = await login(freshPhone(), "Double Claimer");
  const [a, b] = await Promise.all([1, 2].map(() => apiCall<{ claim: { code: string } }>(`/api/deals/${feed.data.deals[1]._id}/claim`, { method: "POST", token })));
  expect([a.status, b.status].every((s) => s === 200 || s === 201)).toBe(true);
  const mine = await apiCall<{ claims: unknown[] }>("/api/me/claims", { token });
  expect(mine.data.claims).toHaveLength(1);
});

test("RSVP to an event that doesn't exist is a 404, not 'event is full'", async () => {
  const r = await apiCall("/api/events/no-such-event/rsvp", { method: "POST", token: tokenOf("player") });
  expect(r.status).toBe(404);
});

test("a court can't close before it opens", async () => {
  const venues = await apiCall<{ items: { _id: string }[] }>("/api/venue/venues", { token: tokenOf("merchant") });
  const r = await apiCall("/api/venue/courts", {
    token: tokenOf("merchant"),
    body: { business: venues.data.items[0]._id, name: "Bad Court", sport: "cricket", pricePerHour: 500, peakPricePerHour: 700, openHour: 20, closeHour: 8 },
  });
  expect(r.status).toBe(400);
});

test("OTP: asking again within a minute is politely refused", async () => {
  const phone = freshPhone();
  expect((await apiCall("/api/auth/otp", { body: { phone } })).status).toBe(200);
  expect((await apiCall("/api/auth/otp", { body: { phone } })).status).toBe(429);
});
