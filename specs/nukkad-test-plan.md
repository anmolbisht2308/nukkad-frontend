# Nukkad test plan

Automated in `e2e/` with Playwright and run on two devices: desktop Chrome (1366×900) and Pixel 7.

## Before you run

1. Start Mongo, the API (`npm run dev` in `api/`, with `OTP_DEV_MODE` on) and the web app on port 3200.
2. Run `npm run seed` in `api/` for fresh demo data.
3. Run `npm run test:e2e` in `web/`, or `npm run test:e2e:ui` to watch the tests run.

## 1. Every screen (`pages.spec.ts`)
These checks run on every public, signed-in, shop, venue and organiser screen:
- The page loads with no crash, no console errors and no API 5xx errors.
- Nothing scrolls sideways on a phone.
- axe-core finds no serious or critical WCAG 2.1 AA problems: contrast, labels, names and similar.
- An unknown page or shop shows the friendly Nukkad 404.

## 2. Players (`player.spec.ts`)
- **Login:** phone + OTP works. A bad number and a wrong code each show a clear error.
- **Deals and shops:**
  - Claim a deal and find the coupon under My coupons.
  - Follow and unfollow a truck.
  - Ask to be notified when a shop opens.
  - RSVP to an event and remove the RSVP.
- **Turf bookings:**
  - Pay-at-venue booking, then see it in My bookings and cancel it.
  - Online payment, split with a friend.
  - A slot taken a moment earlier can't be double-booked.
  - On a phone, the Pay button stays above the tab bar and can be tapped.
- **Open games:** host one from a booking, and a friend joins it.
- **Hindi:** switch the app to Hindi and back.
- **Logged out:** visitors are asked to log in before claiming, and the API refuses protected routes.

## 3. Shops, venues and organisers (`business.spec.ts`)
- **Shop dashboard:**
  - Redeem a coupon once (lowercase typing is fine), and a second try is refused.
  - An unknown code shows an error.
  - Publish a deal.
  - Take a food truck live.
- **Venue calendar:** add a walk-in and mark it played, and block a slot for maintenance.
- **Organiser:**
  - Create a tournament and register teams (in the app and through the API).
  - Generate fixtures, after which registration closes.
  - A tournament can't start in the past.
  - Organisers can't lay out event stalls; that is admin-only.

## 4. Server rules and races (`api.spec.ts`, runs once)
- **Knockout seeding:** byes go to the top seeds, and seeds 1 and 2 are in opposite halves.
- **Races that must not overfill or double-count:**
  - Several captains going for the last free spot.
  - A double-tapped payment confirm.
  - Five people booking the same slot (exactly one wins).
  - A double-tapped coupon claim (same coupon comes back).
- **Scores:**
  - Correcting the final after the tournament ends changes the champion.
  - A score fix that keeps the same winner is accepted.
- **Tournament status:** only sensible moves are allowed.
- **Validation:** unknown event RSVP is a 404, a court can't close before it opens, and asking for a second OTP within a minute is refused.

## Using the Playwright AI agents in Claude Code
`npx playwright init-agents --loop=claude` already set up three agents in `.claude/agents/`, plus `.mcp.json`:
- **Planner:** explores the running app and writes plans into this folder.
- **Generator:** turns a plan into tests.
- **Healer:** fixes failing tests.

To use them, open Claude Code in `web/` and ask, for example, "use the playwright test planner to plan tests for the creator studio".
