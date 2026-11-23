import { expect, test } from "@playwright/test";
import { apiCall, freshPhone, login, statePath, tokenOf } from "./env";

type Deal = { _id: string; title: string; business: { slug: string } };

/** A fresh player claims a live deal through the API and hands back the coupon code. */
async function claimCoupon() {
  const feed = await apiCall<{ deals: Deal[] }>("/api/feed?when=week");
  const deal = feed.data.deals[0];
  const token = await login(freshPhone(), "Coupon Fan");
  const r = await apiCall<{ claim: { code: string } }>(`/api/deals/${deal._id}/claim`, { method: "POST", token });
  expect(r.status).toBe(201);
  return { code: r.data.claim.code, deal };
}

test.describe("shop owner dashboard", () => {
  test.use({ storageState: statePath("merchant") });

  test("redeems a customer's coupon once, and refuses it the second time", async ({ page }) => {
    const { code, deal } = await claimCoupon();
    await page.goto("/merchant");
    const input = page.getByPlaceholder("ABC123");
    await input.fill(code.toLowerCase()); // staff may type lowercase
    await page.getByRole("button", { name: "Redeem" }).click();
    await expect(page.getByText(deal.title).first()).toBeVisible();
    await input.fill(code);
    await page.getByRole("button", { name: "Redeem" }).click();
    await expect(page.getByText(/Already used/)).toBeVisible();
  });

  test("an unknown coupon code shows a clear error", async ({ page }) => {
    await page.goto("/merchant");
    await page.getByPlaceholder("ABC123").fill("ZZZZZZ");
    await page.getByRole("button", { name: "Redeem" }).click();
    await expect(page.getByText("Code not found")).toBeVisible();
  });

  test("publishes a new deal", async ({ page }) => {
    await page.goto("/merchant");
    const title = `Free chai test ${Date.now() % 100000}`;
    await page.getByPlaceholder("e.g. Free chai with any roll").fill(title);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Deal is live").first()).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("a food truck goes live at a spot", async ({ page }) => {
    await page.goto("/merchant");
    await page.getByLabel("Choose business").selectOption({ label: /Momo Bros/ as unknown as string }).catch(async () => {
      const opt = await page.getByLabel("Choose business").locator("option", { hasText: "Momo Bros" }).getAttribute("value");
      await page.getByLabel("Choose business").selectOption(opt!);
    });
    await expect(page.getByRole("heading", { name: "Where are you parked?" })).toBeVisible();
    const close = page.getByRole("button", { name: "Close for today" });
    if (await close.isVisible()) {
      await close.click();
      await expect(page.getByText("Closed for today").first()).toBeVisible();
    }
    await page.getByRole("button", { name: "🚚 Go live here" }).click();
    await expect(page.getByText("You're live!").first()).toBeVisible();
  });
});

test.describe("venue owner calendar", () => {
  test.use({ storageState: statePath("merchant") });

  test("adds a walk-in, then marks it as played", async ({ page }, info) => {
    await page.goto("/merchant/venue");
    // last day in the strip, so the slot is in the future; phone and desktop use different hours
    await page.locator("main button:visible").filter({ hasText: /^(Today|Tmrw|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/ }).last().click();
    await page.waitForLoadState("networkidle");
    const freeCells = page.locator("main button:visible:not([disabled])").filter({ hasText: /^₹[\d,]+( 🔥)?$/ });
    await expect(freeCells.first()).toBeVisible();
    await freeCells.nth(info.project.name === "phone" ? 3 : 1).click();
    const name = `Walk-in ${info.project.name} ${Date.now() % 10000}`;
    await page.getByPlaceholder("Customer name").fill(name);
    await page.getByRole("button", { name: "Add walk-in" }).click();
    await expect(page.getByText("Walk-in added").first()).toBeVisible();
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.getByRole("button", { name: "✓ Played" }).click();
    await expect(page.getByText("Marked as played").first()).toBeVisible();
  });

  test("blocks a slot for maintenance", async ({ page }, info) => {
    await page.goto("/merchant/venue");
    await page.locator("main button:visible").filter({ hasText: /^(Today|Tmrw|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/ }).nth(5).click();
    await page.waitForLoadState("networkidle");
    const freeCells = page.locator("main button:visible:not([disabled])").filter({ hasText: /^₹[\d,]+( 🔥)?$/ });
    await freeCells.nth(info.project.name === "phone" ? 4 : 2).click();
    await page.getByRole("button", { name: "⛔ Block" }).click();
    await page.getByPlaceholder("Reason").fill("Net repair");
    await page.getByRole("button", { name: "Block slot" }).click();
    await expect(page.getByText("Slot blocked").first()).toBeVisible();
  });
});

test.describe("tournament organiser", () => {
  test.use({ storageState: statePath("organiser") });

  test("creates a free tournament, teams register, fixtures are generated", async ({ page, browser }, info) => {
    await page.goto("/host");
    const title = `QA Cup ${info.project.name} ${Date.now() % 100000}`;
    await page.getByPlaceholder("Tournament name, e.g. Winter Box Cricket Cup").fill(title);
    const start = new Date(Date.now() + 3 * 86_400_000 + 330 * 60_000).toISOString().slice(0, 16);
    await page.getByLabel("Starts").fill(start);
    await page.getByLabel("Entry fee per team (₹)").fill("0");
    await page.getByLabel("Players / team").fill("2");
    await page.getByLabel("Max teams").fill("4");
    await page.getByRole("button", { name: "Create tournament" }).click();
    await expect(page.getByText("Tournament created").first()).toBeVisible();

    const list = await apiCall<{ organising: { slug: string; title: string }[] }>("/api/host/mine", { token: tokenOf("organiser") });
    const slug = list.data.organising.find((t) => t.title === title)!.slug;

    // a player registers through the public page
    const ctx = await browser.newContext({ ...info.project.use, storageState: statePath("player") });
    const p = await ctx.newPage();
    await p.goto(`/tournaments/${slug}`);
    await p.getByRole("button", { name: "Register your team" }).click();
    await p.getByPlaceholder("Team name").fill("QA Strikers");
    const names = p.getByPlaceholder("Name", { exact: true });
    await names.nth(0).fill("Asha");
    await names.nth(1).fill("Dev");
    await p.getByRole("button", { name: "Register for free" }).click();
    await expect(p.getByText(/QA Strikers/).first()).toBeVisible();
    await ctx.close();

    // a second team signs up through the API
    const second = await apiCall(`/api/host/tournaments/${slug}/register`, {
      token: await login(freshPhone(), "Captain Two"),
      body: { teamName: "QA Smashers", players: [{ name: "Ravi" }, { name: "Neel" }] },
    });
    expect(second.status).toBe(201);

    await page.reload();
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect(page.getByRole("heading", { name: new RegExp(title) })).toBeVisible();
    await expect(page.getByText("2 confirmed teams")).toBeVisible();
    await page.getByRole("button", { name: "Generate fixtures" }).click();
    await expect(page.getByText(/fixtures generated/).first()).toBeVisible();

    // once fixtures exist, nobody else can sign up
    const late = await apiCall(`/api/host/tournaments/${slug}/register`, {
      token: await login(freshPhone(), "Late Captain"),
      body: { teamName: "Too Late", players: [{ name: "A" }, { name: "B" }] },
    });
    expect(late.status).toBe(409);
  });

  test("cannot create a tournament that starts in the past", async () => {
    const r = await apiCall("/api/host/tournaments", {
      token: tokenOf("organiser"),
      body: { title: "Yesterday Cup", sport: "cricket", format: "knockout", startsAt: new Date(Date.now() - 86_400_000).toISOString() },
    });
    expect(r.status).toBe(400);
  });

  test("an organiser cannot rebuild stalls at someone else's event", async () => {
    const r = await apiCall("/api/host/events/food-truck-friday/stalls", {
      token: tokenOf("organiser"),
      body: { rows: 1, cols: 1, price: 99999 },
    });
    expect([403, 404]).toContain(r.status);
  });
});
