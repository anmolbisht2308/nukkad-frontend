import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { statePath } from "./env";

/**
 * Visual tour: screenshots of every popup, menu, sheet and busy screen, on phone and desktop,
 * for a person to look over. Run with:  TOUR=1 npx playwright test e2e/tour.spec.ts
 * Pictures land in e2e/.results/tour/.
 */
test.skip(!process.env.TOUR, "set TOUR=1 to take the tour");

const snap = async (page: Page, info: TestInfo, name: string) => {
  await page.waitForTimeout(900); // let springs and fades settle
  await page.screenshot({ path: `e2e/.results/tour/${info.project.name}-${name}.png` });
};
const days = (page: Page) => page.locator("main button:visible").filter({ hasText: /^(Today|Tmrw|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/ });

test("logged out", async ({ page }, info) => {
  await page.goto("/");
  await snap(page, info, "01-landing");
  await page.goto("/pulse");
  await page.getByRole("button", { name: /^City:/ }).click();
  await snap(page, info, "02-city-menu");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^log ?in$/i }).first().click();
  await snap(page, info, "03-login");
  await page.getByPlaceholder("98765 43210").fill("12");
  await page.getByRole("button", { name: "Send code" }).click();
  await snap(page, info, "04-login-error");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Switch language" }).first().click();
  await snap(page, info, "05-pulse-hindi");
  await page.getByRole("button", { name: "Switch language" }).first().click();
  await page.goto("/b/threads-and-co");
  await snap(page, info, "06-coming-soon");
  await page.goto("/nope");
  await snap(page, info, "07-404");
});

test("player", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, storageState: statePath("player") });
  const page = await ctx.newPage();
  await page.goto("/pulse");
  await page.getByRole("button", { name: "Account" }).click();
  await snap(page, info, "10-account-menu");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Claim", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await snap(page, info, "11-coupon");
  await page.getByRole("button", { name: "Done" }).click();
  await snap(page, info, "12-after-coupon-toast");

  await page.goto("/play/box-cricket-hub");
  await days(page).nth(2).click();
  const free = page.locator("main button:visible:not([disabled])").filter({ hasText: /^\d{1,2} (AM|PM)₹/ });
  await free.nth(2).click();
  await page.getByRole("button", { name: "+ Add friend" }).click();
  await snap(page, info, "13-booking-sheet");
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  await expect(page.getByText("You're booked!")).toBeVisible({ timeout: 15_000 });
  await snap(page, info, "14-booked");
  await page.goto("/bookings");
  await snap(page, info, "15-bookings");
  await page.goto("/tournaments/sunday-football-7s");
  await page.getByRole("button", { name: "Register your team" }).click();
  await snap(page, info, "16-register-sheet");
  await page.keyboard.press("Escape");
  await page.goto("/events/food-truck-friday");
  await snap(page, info, "17-event");
  await page.goto("/me");
  await snap(page, info, "18-me");
  await page.goto("/inbox");
  await snap(page, info, "19-inbox");
  await ctx.close();
});

test("business", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, storageState: statePath("merchant") });
  const page = await ctx.newPage();
  await page.goto("/merchant");
  await snap(page, info, "20-merchant");
  await page.goto("/merchant/venue");
  await days(page).last().click();
  await page.waitForLoadState("networkidle");
  await page.locator("main button:visible:not([disabled])").filter({ hasText: /^₹[\d,]+( 🔥)?$/ }).first().click();
  await snap(page, info, "21-venue-new-booking");
  await page.keyboard.press("Escape");
  await snap(page, info, "22-venue-calendar");
  await page.goto("/creators");
  await page.getByRole("button", { name: /^Hire/ }).first().click();
  await snap(page, info, "23-hire-creator");
  await ctx.close();

  const org = await browser.newContext({ ...info.project.use, storageState: statePath("organiser") });
  const op = await org.newPage();
  await op.goto("/host");
  await snap(op, info, "24-host");
  await org.close();
});
