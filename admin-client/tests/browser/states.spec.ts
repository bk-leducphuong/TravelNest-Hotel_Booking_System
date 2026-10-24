import { test, expect } from "@playwright/test";
import { stubConsole } from "./support/console";

test.beforeEach(async ({ page }) => {
  await stubConsole(page);
});

for (const path of [
  "/",
  "/rooms",
  "/bookings",
  "/reservations",
  "/availability",
  "/reviews",
  "/payments",
  "/payouts",
  "/settings/team",
]) {
  test(`${path}: no hotel avoids API calls`, async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/admin/")) calls.push(request.url());
    });
    await page.goto(`${path}?fixture=nohotel`);
    await expect(page.locator("main")).toContainText(
      /No hotel|Select a hotel/i
    );
    expect(calls).toEqual([]);
  });
}

test("read-only user can inspect records but has no mutation controls", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/api/v1/") &&
      !["GET", "OPTIONS"].includes(request.method())
    )
      writes.push(request.url());
  });
  for (const path of [
    "/rooms/room-1",
    "/bookings/booking-1",
    "/payments/transactions/transaction-1",
    "/reviews/review-1",
    "/properties/hotel-1",
    "/availability",
  ]) {
    await page.goto(`${path}?fixture=readonly`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /^(Save|Upload|Deactivate|Mark |Issue refund|Post reply|Block dates|Apply changes)/,
      })
    ).toHaveCount(0);
  }
  expect(writes).toEqual([]);
});

test("direct forbidden route does not load protected data", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/admin/reviews"))
      calls.push(request.url());
  });
  await page.goto("/reviews?fixture=roomsonly");
  await expect(page.locator("main")).toContainText(
    "You do not have permission"
  );
  await expect(
    page.getByRole("link", { name: "Reviews", exact: true })
  ).toHaveCount(0);
  expect(calls).toEqual([]);
});

for (const [path, endpoint, empty] of [
  ["/rooms", "**/admin/hotels/hotel-1/rooms", { data: { rooms: [] } }],
  [
    "/bookings",
    "**/admin/bookings?*",
    { data: [], meta: { total: 0, page: 1, limit: 20 } },
  ],
  [
    "/reviews",
    "**/admin/reviews?*",
    { data: [], meta: { total: 0, page: 1, limit: 20 } },
  ],
  [
    "/payments",
    "**/admin/payments/transactions?*",
    { data: [], meta: { total: 0, page: 1, limit: 20 } },
  ],
]) {
  test(`${path}: list failures remain distinct from empty results`, async ({
    page,
  }, testInfo) => {
    await page.route(endpoint as string, (route) =>
      route.fulfill({
        status: 503,
        json: { error: { message: "Temporarily unavailable" } },
      })
    );
    await page.goto(path as string);
    await expect(page.getByRole("alert")).toContainText(
      "Temporarily unavailable"
    );
    await page.screenshot({
      path: testInfo.outputPath("failure.png"),
      fullPage: true,
    });
    await page.unroute(endpoint as string);
    await page.route(endpoint as string, (route) =>
      route.fulfill({ json: empty })
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator("main")).toContainText(
      /No matching rooms|No bookings|No reviews|No transactions/
    );
    await page.screenshot({
      path: testInfo.outputPath("empty.png"),
      fullPage: true,
    });
  });
}
