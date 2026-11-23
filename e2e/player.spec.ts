import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { apiCall, freshPhone, login, statePath, tokenOf } from "./env";

/** Each browser project books at its own venue so parallel runs never fight over the same slot. */
const venueFor = (info: TestInfo) => (info.project.name === "phone" ? "kickoff-arena" : "box-cricket-hub");

/** Picks tomorrow, then the first free slot (an hour that is not Booked/past). Returns its label, e.g. "7 PM". */
async function pickFreeSlot(page: Page, dayIndex = 1) {
  const dayChips = page.locator("main button:visible").filter({ hasText: /^(Today|Tmrw|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/ });
  await dayChips.nth(dayIndex).click();
  const free = page.locator("main button:visible:not([disabled])").filter({ hasText: /^\d{1,2} (AM|PM)₹/ });
  await expect(free.first()).toBeVisible();
  const label = (await free.first().locator("span").first().textContent())!.trim();
  await free.first().click();
  return label;
}

test.describe("logging in", () => {
  test("new user logs in with phone + OTP and sees the account menu", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: /^log ?in$/i }).first().click();
    await page.getByPlaceholder("98765 43210").fill(freshPhone());
    await page.getByPlaceholder("Your name (optional)").fill("Riya");
    await page.getByRole("button", { name: "Send code" }).click();
    // dev mode shows the code; tapping it fills the field
    await page.getByText(/Dev mode: no SMS is sent/).getByRole("button").click();
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  });

  test("a wrong phone number shows a clear error", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: /^log ?in$/i }).first().click();
    await page.getByPlaceholder("98765 43210").fill("12345");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter a valid 10-digit mobile number")).toBeVisible();
  });

  test("a wrong code is rejected", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: /^log ?in$/i }).first().click();
    await page.getByPlaceholder("98765 43210").fill(freshPhone());
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByPlaceholder("••••••").fill("000000");
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await expect(page.getByText(/Wrong code/)).toBeVisible();
  });
});

test.describe("as a signed-in player", () => {
  test.use({ storageState: statePath("player") });

  test("claims a deal on City Pulse and finds the coupon under My coupons", async ({ page }) => {
    await page.goto("/pulse");
    await page.getByRole("button", { name: "Claim", exact: true }).first().click();
    const dialog = page.locator("text=/^[A-Z2-9]{6}$/").first();
    await expect(dialog).toBeVisible();
    const code = (await dialog.textContent())!.trim();
    await page.getByRole("button", { name: "Done" }).click();
    await page.goto("/me");
    await expect(page.getByText(code)).toBeVisible();
  });

  test("follows and unfollows a food truck", async ({ page }) => {
    await page.goto("/b/momo-bros-truck");
    const follow = page.getByRole("button", { name: /^(\+ )?Follow/ });
    await follow.click();
    await expect(page.getByText("Following Momo Bros", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /Following/ }).click();
    await expect(page.getByText(/Unfollowed/).first()).toBeVisible();
  });

  test("asks to be notified when a shop opens", async ({ page }) => {
    // a brand-new user, so this works the same on every run and device
    const token = await login(freshPhone(), "New Fan");
    await page.addInitScript((t) => localStorage.setItem("nukkad.token", t), token);
    await page.goto("/b/threads-and-co");
    await page.getByRole("button", { name: /notify me|remind me|ping me/i }).first().click();
    await expect(page.getByText(/We'll ping you when/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /alert on opening day/ })).toBeVisible();
  });

  test("RSVPs to an event and cancels it", async ({ page }) => {
    await page.goto("/events/food-truck-friday");
    await page.getByRole("button", { name: /^I'm in/ }).first().click();
    await expect(page.getByText("You're in!").first()).toBeVisible();
    await page.getByRole("button", { name: /going|I'm in/i }).first().click();
    await expect(page.getByText("RSVP removed").first()).toBeVisible();
  });

  test("books a slot to pay at the venue, sees it in My bookings, then cancels", async ({ page }, info) => {
    await page.goto(`/play/${venueFor(info)}`);
    await pickFreeSlot(page, 2);
    await page.getByRole("button", { name: /Pay at venue/ }).click();
    await page.getByRole("button", { name: "Reserve slot" }).click();
    await expect(page.getByText("You're booked!")).toBeVisible();
    await page.getByRole("link", { name: "View my bookings" }).click();
    await expect(page).toHaveURL(/\/bookings/);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /^Cancel/ }).first().click();
    await expect(page.getByText("Booking cancelled").first()).toBeVisible();
  });

  test("on a phone, the Pay button sits above the bottom tab bar and can be tapped", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "phone layout only");
    await page.goto(`/play/${venueFor(info)}`);
    await pickFreeSlot(page, 6);
    const pay = page.getByRole("button", { name: /^Pay ₹/ });
    await expect(pay).toBeVisible();
    await page.waitForTimeout(700); // sheet slides up
    const onTop = await pay.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && (hit === el || el.contains(hit)) && r.bottom <= window.innerHeight;
    });
    expect(onTop, "Pay button is covered or off-screen").toBe(true);
  });

  test("pays online for a slot with a friend splitting the cost", async ({ page }, info) => {
    await page.goto(`/play/${venueFor(info)}`);
    await pickFreeSlot(page, 3);
    await page.getByRole("button", { name: "+ Add friend" }).click();
    await page.getByPlaceholder(/name/i).last().fill("Kabir");
    await expect(page.getByText(/each/).first()).toBeVisible();
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await expect(page.getByText("You're booked!")).toBeVisible({ timeout: 15_000 });
  });

  test("a slot someone just took cannot be booked twice", async ({ page }, info) => {
    const venue = venueFor(info);
    await page.goto(`/play/${venue}`);
    await page.waitForLoadState("networkidle");
    // remember exactly which day/slot the page shows, then let "someone else" grab it first
    const loaded = page.waitForResponse((r) => r.url().includes("/availability?date=") && r.url().includes(venue));
    await page.locator("main button:visible").filter({ hasText: /^(Today|Tmrw|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/ }).nth(4).click();
    const a = (await (await loaded).json()) as { date: string; courts: { _id: string; slots: { hour: number; status: string }[] }[] };
    const court = a.courts[0];
    const hour = court.slots.find((s) => s.status === "free")!.hour;
    const free = page.locator("main button:visible:not([disabled])").filter({ hasText: /^\d{1,2} (AM|PM)₹/ });
    await expect(free.first()).toBeVisible();
    await page.waitForTimeout(500); // slot grid animates in
    await free.first().click();
    await expect(page.getByRole("button", { name: /Pay at venue/ })).toBeVisible();
    const r = await apiCall("/api/play/bookings", {
      token: tokenOf("friend"),
      body: { courtId: court._id, date: a.date, startHour: hour, hours: 1, payMode: "venue" },
    });
    expect(r.status).toBe(201);
    await page.getByRole("button", { name: /Pay at venue/ }).click();
    await page.getByRole("button", { name: "Reserve slot" }).click();
    await expect(page.getByText(/Someone just booked one of these slots/)).toBeVisible();
    await expect(page.getByText("You're booked!")).toHaveCount(0);
  });

  test("hosts an open game and a friend joins it", async ({ page, browser }, info) => {
    // a confirmed booking to open up
    const venue = venueFor(info);
    const date = new Date(Date.now() + 330 * 60_000 + 5 * 86_400_000).toISOString().slice(0, 10);
    const a = await apiCall<{ courts: { _id: string; slots: { hour: number; status: string }[] }[] }>(`/api/play/venues/${venue}/availability?date=${date}`);
    const court = a.data.courts[0];
    const hour = court.slots.filter((s) => s.status === "free").at(-1)!.hour;
    const b = await apiCall<{ booking: { _id: string } }>("/api/play/bookings", {
      token: tokenOf("player"),
      body: { courtId: court._id, date, startHour: hour, hours: 1, payMode: "venue" },
    });
    expect(b.status).toBe(201);

    await page.goto("/bookings");
    await page.getByRole("button", { name: /Find players|Open game|Need players/i }).first().click();
    await page.getByRole("button", { name: "Post open game" }).click();
    await expect(page.getByText("Open game posted").first()).toBeVisible();

    const friend = await browser.newContext({ storageState: statePath("friend"), ...info.project.use });
    const fp = await friend.newPage();
    await fp.goto("/play");
    await fp.getByRole("button", { name: /^Join/ }).first().click();
    await expect(fp.getByText("You're in the game!").first()).toBeVisible();
    await friend.close();
  });

  test("switches the app to Hindi and back", async ({ page }) => {
    await page.goto("/pulse");
    const devanagari = /[ऀ-ॿ]/;
    await page.getByRole("button", { name: "Switch language" }).first().click();
    await expect(page.getByRole("navigation", { name: "Main" }).or(page.locator("header nav")).first()).toContainText(devanagari);
    await page.getByRole("button", { name: "Switch language" }).first().click();
    await expect(page.getByRole("navigation", { name: "Main" }).or(page.locator("header nav")).first()).not.toContainText(devanagari);
  });

  test("notifications appear in the inbox", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.locator("main")).toContainText(/Booked|booking|You're|points|No notifications|nothing/i);
  });
});

test("logged-out visitors are asked to log in before claiming", async ({ page }) => {
  await page.goto("/pulse");
  await page.getByRole("button", { name: "Claim", exact: true }).first().click();
  await expect(page.getByPlaceholder("98765 43210")).toBeVisible();
});

test("API refuses protected actions without a login", async () => {
  expect((await apiCall("/api/me/claims")).status).toBe(401);
  expect((await apiCall("/api/merchant/businesses")).status).toBe(401);
  const player = await login(freshPhone());
  expect((await apiCall("/api/merchant/businesses", { token: player })).status).toBe(403);
  expect((await apiCall("/api/venue/calendar", { token: player })).status).toBe(403);
});
