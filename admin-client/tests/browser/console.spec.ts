import { test, expect } from "@playwright/test";
import { stubConsole, sampleBooking, sampleHotel } from "./support/console";

test.beforeEach(async ({ page }) => {
  await stubConsole(page);
});

for (const [label, path] of [
  ["dashboard", "/"],
  ["rooms", "/rooms"],
  ["room-create", "/rooms/new"],
  ["room-detail", "/rooms/room-1"],
  ["bookings", "/bookings"],
  ["booking-detail", "/bookings/booking-1"],
  ["reservations", "/reservations"],
  ["availability", "/availability"],
  ["properties", "/properties"],
  ["property-detail", "/properties/hotel-1"],
  ["reviews", "/reviews"],
  ["review-detail", "/reviews/review-1"],
  ["finance", "/payments"],
  ["transaction-detail", "/payments/transactions/transaction-1"],
  ["refunds", "/payments/refunds"],
  ["payouts", "/payouts"],
  ["payout-detail", "/payouts/payout-1"],
  ["connected-accounts", "/payouts/connected-accounts"],
  ["settings", "/settings"],
  ["team", "/settings/team"],
]) {
  test(`${label}: responsive screen and runtime smoke`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path!);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("No test fixture for");
    // Explicit data waits avoid taking screenshots of async loading frames.
    if (path === "/")
      await expect(page.getByText("TN-1042", { exact: true })).toBeVisible();
    else if (path === "/properties/hotel-1")
      await expect(
        page.getByRole("textbox", { name: "Name", exact: true })
      ).toHaveValue(sampleHotel.name);
    else if (path === "/reviews")
      await expect(
        page.getByText("A peaceful stay", { exact: true })
      ).toBeVisible();
    else if (path === "/payments")
      await expect(
        page.getByText("Completed transactions", { exact: true })
      ).toBeVisible();
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          )
        )
        .toBe(true);
      if (width === 375) {
        // Long localized page titles must not push the shell actions onto a
        // second row.
        expect(
          await page.evaluate(() =>
            Math.round(
              document.querySelector("header")!.getBoundingClientRect().height
            )
          )
        ).toBeLessThanOrEqual(76);
      }
      if (width === 1440 || width === 375)
        await page.screenshot({
          path: testInfo.outputPath(`${label}-${width}.png`),
          fullPage: true,
        });
    }
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Tiếng Việt" }).click();
    await expect(page.locator("main h1")).toBeVisible();
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          )
        )
        .toBe(true);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: testInfo.outputPath(`${label}-vi-${width}.png`),
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
}

test("summary scope is independent of pagination and filters; monetary totals are omitted", async ({
  page,
}) => {
  await page.goto("/bookings");
  const bookingSummary = page
    .locator(".tn-section")
    .filter({ has: page.getByText("Total bookings", { exact: true }) });
  await expect(bookingSummary).toContainText("67");
  await page.locator(".el-pagination .btn-next").click();
  await expect(bookingSummary).toContainText("67");
  await page.goto("/payments");
  await expect(page.locator("main")).toContainText("120");
  await expect(page.locator("main")).not.toContainText("99,999,999");
  await expect(page.locator("main")).toContainText(
    "Financial totals are unavailable"
  );
  await expect(
    page.getByText("Status breakdown", { exact: true })
  ).toBeVisible();
});

test("summary errors do not become zero and summary retry recovers", async ({
  page,
}) => {
  await page.route("**/admin/reviews/summary?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "Summary offline" } },
    })
  );
  await page.goto("/reviews");
  await expect(
    page.getByText("Summary unavailable. Try refreshing.", { exact: true })
  ).toBeVisible();
  const rating = page.locator(".tn-section").filter({
    has: page.getByText("Published review average", { exact: true }),
  });
  await expect(rating).toContainText("—");
  await expect(
    page.getByText("A peaceful stay", { exact: true })
  ).toBeVisible();
  await page.unroute("**/admin/reviews/summary?*");
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  await expect(rating).toContainText("8.6/10");
});

test("property section saves preserve unsaved drafts and protect hotel switching", async ({
  page,
}) => {
  await page.goto("/properties/hotel-1");
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Updated Riverside");
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill("Draft address");
  const patch = page.waitForRequest((request) => request.method() === "PATCH");
  await page
    .locator("section.tn-section")
    .filter({
      has: page.getByRole("heading", {
        name: "Property information",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Save section", exact: true })
    .click();
  const payload = (await patch).postDataJSON();
  expect(payload.name).toBe("Updated Riverside");
  expect(payload).not.toHaveProperty("address");
  await expect(
    page.getByRole("textbox", { name: "Address", exact: true })
  ).toHaveValue("Draft address");
  await page.locator("#desktop-hotel").press("Enter");
  await page.getByRole("option", { name: "TravelNest Garden" }).click();
  await expect(
    page.getByRole("dialog", { name: "Unsaved changes" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Stay here", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Address", exact: true })
  ).toHaveValue("Draft address");
});

test("availability bulk edits keep date status and record currency after reload", async ({
  page,
}) => {
  await page.goto("/availability");
  const first = page
    .locator("main button[aria-label]")
    .filter({ hasText: "Open" })
    .first();
  await expect(first).toBeEnabled();
  await first.click();
  const patch = page.waitForRequest((request) => request.method() === "PATCH");
  await page.getByRole("button", { name: "Block dates", exact: true }).click();
  expect((await patch).postDataJSON().entries[0].status).toBe("close");
  await expect(
    page
      .locator("main button[aria-label]")
      .filter({ hasText: "Closed" })
      .first()
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("₫");
});

test("booking status and refund actions retain their existing payloads", async ({
  page,
}) => {
  await page.goto("/bookings/booking-1");
  const status = page.waitForRequest((request) => request.method() === "PATCH");
  await page
    .getByRole("button", { name: "Mark Checked in", exact: true })
    .click();
  expect((await status).postDataJSON()).toEqual({ status: "checked_in" });
  await expect(
    page.getByRole("heading", { name: sampleBooking.booking_code, exact: true })
  ).toBeVisible();
  await page.goto("/payments/transactions/transaction-1");
  await page.getByRole("button", { name: "Issue refund", exact: true }).click();
  const refund = page.waitForRequest((request) => request.method() === "POST");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Refund", exact: true })
    .click();
  expect((await refund).postDataJSON()).toEqual({ reason: "customer_request" });
});

test("review reply retains the ten-point rating scale", async ({ page }) => {
  await page.goto("/reviews/review-1");
  await expect(page.locator("main")).toContainText("8.6/10");
  await expect(page.locator("main")).not.toContainText("8.6/10 / 10");
  await page
    .getByPlaceholder("Write a reply…")
    .fill("Thank you for staying with us.");
  const reply = page.waitForRequest((request) => request.method() === "POST");
  await page.getByRole("button", { name: "Post reply", exact: true }).click();
  expect((await reply).postDataJSON()).toEqual({
    reply: "Thank you for staying with us.",
  });
  await expect(
    page.getByText("Thank you for staying with us.", { exact: true })
  ).toBeVisible();
});

test("quick search restores focus after keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/bookings");
  const trigger = page.getByRole("button", { name: "Go to…", exact: true });
  await expect(trigger).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("combobox", { name: "Search pages" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("team shows localized roles and protects the last owner", async ({
  page,
}) => {
  await page.goto("/settings/team");
  const rows = page.locator(".el-table__body tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Owner");
  await expect(rows.nth(0)).toContainText("Primary owner");
  await expect(rows.nth(0).locator("input")).toBeDisabled();
  await expect(
    rows.nth(0).getByRole("button", { name: "Delete", exact: true })
  ).toBeDisabled();
  await expect(rows.nth(1)).toContainText("Manager");
  await expect(rows.nth(1).locator("input")).toBeEnabled();
});
