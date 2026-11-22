# Nukkad — frontend

Web app for **Nukkad**, a hyperlocal city app for Tier 2/3 cities (starting with Bareilly): food trucks broadcasting where they're parked, new-opening countdowns, QR deals, turf & court booking, open games, tournaments, events and a creator marketplace.

Backend: [nukkad-server](https://github.com/anmolbisht2308/nukkad-server).

**Stack:** Next.js 16 (App Router, cache components), Tailwind CSS v4, Motion, React Three Fiber + drei (3D city hero), GSAP, Lenis.

## Run locally

Start the API first (see nukkad-server), then:

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev -- -p 3200         # http://localhost:3200
```

The API's `WEB_ORIGIN` must match this URL (default `http://localhost:3200`).

Demo logins (after seeding the API; OTP appears on screen in dev mode): merchant `9999999999` · organiser `9888888888` · admin `9000000001` · creator `9820000001`.

## Pages

| Route | What |
|---|---|
| `/` | 3D night-time city landing, live stats, waitlist |
| `/pulse` | Today / tonight / weekend feed: live trucks, events, opening soon, deals |
| `/b/[slug]` | Business page: follow, notify, claim deal, live location |
| `/play`, `/play/[slug]`, `/bookings` | Venues, slot booking with split payments, open games, my bookings |
| `/tournaments`, `/tournaments/[slug]` | Brackets, league tables, team registration |
| `/events/[slug]` | Event details, RSVP, food-stall booking |
| `/creators`, `/creator` | Creator marketplace and creator studio |
| `/me`, `/inbox` | Coupons, points & leaderboard, notifications |
| `/merchant`, `/merchant/venue`, `/host` | Business dashboard, venue calendar, organiser console |

English / Hindi toggle and city picker in the header; app-style bottom tab bar on phones.

## Deploy

Vercel: set `NEXT_PUBLIC_API_URL` to the deployed API URL.
