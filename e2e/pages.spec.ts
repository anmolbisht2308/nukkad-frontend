import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { statePath } from "./env";

/**
 * Every screen, on desktop and phone: it renders, the console and network stay clean,
 * nothing scrolls sideways, and axe finds no serious accessibility problems.
 */
const PUBLIC = [
  ["/", "Landing"],
  ["/pulse", "City Pulse"],
  ["/play", "Play"],
  ["/play/box-cricket-hub", "Venue"],
  ["/tournaments", "Tournaments"],
  ["/tournaments/pickleball-doubles-league", "Tournament"],
  ["/events/food-truck-friday", "Event"],
  ["/b/momo-bros-truck", "Business"],
  ["/b/threads-and-co", "Coming soon business"],
  ["/creators", "Creators"],
] as const;

const SIGNED_IN = [
  ["/me", "Coupons & points"],
  ["/bookings", "Bookings"],
  ["/inbox", "Inbox"],
  ["/creator", "Creator studio"],
] as const;

const MERCHANT = [
  ["/merchant", "Business dashboard"],
  ["/merchant/venue", "Venue calendar"],
] as const;

const ORGANISER = [["/host", "Host console"]] as const;

/** Collects page errors, console errors and failed API calls while the page is open. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Ignore dev-only noise and image hosts we don't control.
    if (/Download the React DevTools|\[HMR\]|\[Fast Refresh\]|favicon|net::ERR_ABORTED/.test(t)) return;
    problems.push(`console: ${t.slice(0, 300)}`);
  });
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/") && r.status() >= 500) problems.push(`API ${r.status()}: ${u}`);
  });
  return problems;
}

async function checkPage(page: Page, path: string) {
  const problems = watch(page);
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} HTTP status`).toBeLessThan(400);
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.locator("main, [role=main]").first()).toBeVisible();
  // let entrance animations finish so axe and layout checks see the final page
  await page.waitForTimeout(800);

  await expect(page.getByText(/something went wrong|application error|unhandled runtime error/i)).toHaveCount(0);

  const overflow = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= w + 1) return false;
        // allow content inside an element that scrolls sideways on purpose
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false;
        }
        return true;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { scroll: document.documentElement.scrollWidth - w, wide };
  });
  expect(overflow.scroll, `${path} scrolls sideways; widest: ${overflow.wide.join(" | ")}`).toBeLessThanOrEqual(1);

  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("canvas");
  // On the landing page the header floats over a dark hero that axe cannot see behind the blur, so it reports false contrast failures.
  if (path === "/") builder = builder.exclude("header");
  const axe = await builder.analyze();
  const serious = axe.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
  expect(serious, `${path} accessibility`).toEqual([]);

  expect(problems, `${path} errors`).toEqual([]);
}

test.describe("public pages", () => {
  for (const [path, name] of PUBLIC) test(`${name} ${path}`, ({ page }) => checkPage(page, path));
});

test.describe("signed-in pages", () => {
  test.use({ storageState: statePath("player") });
  for (const [path, name] of SIGNED_IN) test(`${name} ${path}`, ({ page }) => checkPage(page, path));
});

test.describe("business pages", () => {
  test.use({ storageState: statePath("merchant") });
  for (const [path, name] of MERCHANT) test(`${name} ${path}`, ({ page }) => checkPage(page, path));
});

test.describe("organiser pages", () => {
  test.use({ storageState: statePath("organiser") });
  for (const [path, name] of ORGANISER) test(`${name} ${path}`, ({ page }) => checkPage(page, path));
});

test("unknown page shows a 404, not a crash", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
});

test("unknown business slug shows a friendly not-found", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/b/no-such-shop");
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.getByText(/couldn.t find that page/i).first()).toBeVisible();
  expect(problems).toEqual([]);
});
