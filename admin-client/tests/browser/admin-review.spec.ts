import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { stubConsole, sampleBooking, sampleHotel } from "./support/console";

test.beforeEach(async ({ page }) => {
  await stubConsole(page);
});

for (const width of [375, 1280]) {
  test(`booking actions stay visible at ${width}px without horizontal scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/bookings");
    const view = page.getByRole("link", {
      name: `View ${sampleBooking.booking_code}`,
      exact: true,
    });
    await expect(view).toBeVisible();
    const bounds = await view.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const status = page.locator(".el-table__body .tn-status").first();
    const statusBounds = await status.boundingBox();
    expect(statusBounds!.x + statusBounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: test.info().outputPath(`bookings-${width}.png`),
      fullPage: true,
    });
  });
}

test("booking detail uses contact snapshot when buyer is unavailable", async ({
  page,
}) => {
  await page.route("**/admin/bookings/booking-1", (route) =>
    route.fulfill({
      json: {
        data: {
          ...sampleBooking,
          buyer: null,
          guest_details: { fullName: "Snapshot Guest" },
        },
      },
    })
  );
  await page.goto("/bookings/booking-1");
  await expect(page.getByText("Snapshot Guest", { exact: true })).toBeVisible();
});

test("existing Vietnam timezone mismatch has an explicit draft-only correction", async ({
  page,
}) => {
  await page.route("**/admin/hotels/hotel-1", (route) =>
    route.fulfill({
      json: {
        data: {
          hotel: { ...sampleHotel, timezone: "Europe/Dublin" },
          rooms: [],
          policies: [],
        },
      },
    })
  );
  await page.route("**/countries?*", (route) =>
    route.fulfill({
      json: { data: [{ id: "country-1", name: "Vietnam", iso_code: "VN" }] },
    })
  );
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH") writes.push(request.url());
  });
  await page.goto("/properties/hotel-1");
  await page
    .getByRole("button", { name: "Use Vietnam timezone", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "e.g. Asia/Ho_Chi_Minh" })
  ).toHaveValue("Asia/Ho_Chi_Minh");
  expect(writes).toEqual([]);
  await expect(
    page.getByText("Minimum price (USD / night)", { exact: true })
  ).toBeVisible();
});

test("promotion filters are named and actions remain reachable on a narrow screen", async ({
  page,
}) => {
  await page.route("**/admin/hotels/hotel-1/promotions?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "promo-1",
            name: "Winter sale",
            mode: "automatic",
            status: "active",
            discount_type: "percentage",
            discount_basis_points: 2000,
            currency: "USD",
            room_scope: "all",
            room_ids: [],
            redeemed_count: 0,
            booking_starts_at: "2026-11-01T12:00:00Z",
            booking_ends_at: "2026-12-01T12:00:00Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 20 },
      },
    })
  );
  await page.setViewportSize({ width: 375, height: 960 });
  await page.goto("/promotions");
  await expect(
    page.getByRole("textbox", { name: "Search promotions", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Mode", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Status", exact: true })
  ).toBeVisible();
  const usage = page.getByRole("button", { name: "Usage", exact: true });
  await expect(usage).toBeVisible();
  const bounds = await usage.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await expect(page.locator("main")).toContainText("UTC");
  await page.screenshot({
    path: test.info().outputPath("promotions-375.png"),
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    }))
  ).toEqual([]);
});

test("initial HTML provides loading feedback before JavaScript starts", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("Loading your property workspace");
  expect(html).toContain("Đang tải không gian quản lý");
  expect(html).toContain('href="/"');
});

test("dashboard distinguishes blocked room-nights from sellable inventory", async ({
  page,
}) => {
  await page.route("**/occupancy*", (route) =>
    route.fulfill({
      json: {
        data: {
          totalRooms: 10,
          bookedRooms: 2,
          heldRooms: 1,
          availableRooms: 3,
          unavailableRooms: 4,
          occupancyRate: 20,
          startDate: "2026-11-01",
          endDate: "2026-11-30",
        },
      },
    })
  );
  await page.goto("/");
  await expect(
    page.getByText("Blocked / unavailable", { exact: true })
  ).toBeVisible();
});
