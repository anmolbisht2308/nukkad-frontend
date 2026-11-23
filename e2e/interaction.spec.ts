import { expect, test, type Page } from "@playwright/test";
import { statePath } from "./env";

/** How the UI behaves while you use it: focus styles, menus vs popups, Esc, scroll lock. */

const cityButton = (page: Page) => page.getByRole("button", { name: /^City:/ });
const cityMenu = (page: Page) => page.getByRole("button", { name: /Moradabad/ });
const loginSheet = (page: Page) => page.getByRole("dialog", { name: "Log in" });

/** A visible orange ring drawn by the global :focus-visible rule. */
const outline = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
  });

test("a focused text field shows one orange border, not a second ring inside it", async ({ page }) => {
  await page.goto("/pulse");
  await page.getByRole("button", { name: /^log ?in$/i }).first().click();
  const phone = page.getByPlaceholder("98765 43210");
  await expect(phone).toBeFocused();
  expect(await outline(page, 'input[placeholder="98765 43210"]')).toBe(false);
  // the rounded box around +91 turns orange instead
  const box = await phone.locator("xpath=..").evaluate((el) => getComputedStyle(el).borderColor);
  expect(box).toBe("rgb(255, 122, 26)");

  const name = page.getByPlaceholder("Your name (optional)");
  await name.focus();
  expect(await outline(page, 'input[placeholder="Your name (optional)"]')).toBe(false);
  expect(await name.evaluate((el) => getComputedStyle(el).borderColor)).toBe("rgb(255, 122, 26)");
});

test("keyboard focus on buttons still shows a ring", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "keyboard check on desktop");
  await page.goto("/pulse");
  await page.keyboard.press("Tab");
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return el && el !== document.body ? getComputedStyle(el).outlineStyle : "none";
  });
  expect(ring).not.toBe("none");
});

test("opening the login popup closes the city menu behind it", async ({ page }) => {
  await page.goto("/creators");
  await cityButton(page).click();
  await expect(cityMenu(page)).toBeVisible();
  // a button that opens the login popup without tapping outside first (keyboard)
  await page.getByRole("button", { name: /^log ?in$/i }).first().focus();
  await page.keyboard.press("Enter");
  await expect(loginSheet(page)).toBeVisible();
  await expect(cityMenu(page)).toBeHidden();
});

test("the city menu closes on a tap outside, on Esc and after picking a city", async ({ page }) => {
  await page.goto("/pulse");
  await cityButton(page).click();
  await expect(cityMenu(page)).toBeVisible();
  await page.mouse.click(5, 400);
  await expect(cityMenu(page)).toBeHidden();

  await cityButton(page).click();
  await expect(cityMenu(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cityMenu(page)).toBeHidden();
});

test("Esc closes the login popup and the page can scroll again", async ({ page }) => {
  await page.goto("/pulse");
  await page.getByRole("button", { name: /^log ?in$/i }).first().click();
  await expect(loginSheet(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(loginSheet(page)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test.describe("signed in", () => {
  test.use({ storageState: statePath("player") });

  test("only one header menu is open at a time, and it closes when you change page", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: "Account" }).click();
    const myBookings = page.getByRole("link", { name: "My bookings" }).first();
    await expect(myBookings).toBeVisible();
    await cityButton(page).click();
    await expect(cityMenu(page)).toBeVisible();
    await expect(page.getByRole("link", { name: "My coupons & points" })).toBeHidden();

    await page.getByRole("button", { name: "Account" }).click();
    await expect(cityMenu(page)).toBeHidden();
    await page.getByRole("link", { name: "My coupons & points" }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole("link", { name: "My coupons & points" })).toBeHidden();
  });

  test("the coupon popup closes with Esc", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: "Claim", exact: true }).first().click();
    const done = page.getByRole("button", { name: "Done" });
    await expect(done).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(done).toBeHidden();
  });
});

for (const path of ["/events/food-truck-friday", "/b/momo-bros-truck", "/b/threads-and-co", "/tournaments/sunday-football-7s"]) {
  test(`the first card on ${path} sits on top of the coloured header, not under it`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const hidden = await page.evaluate(() => {
      const grid = document.querySelector("main section + div");
      const card = grid?.querySelector("h2, h3, p");
      if (!card) return "no card found";
      const r = card.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + 8, r.top + Math.min(8, r.height / 2));
      return hit && (card === hit || card.contains(hit) || hit.contains(card)) ? "" : `covered by ${hit?.tagName}.${String(hit?.className).slice(0, 60)}`;
    });
    expect(hidden).toBe("");
  });
}
