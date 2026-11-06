import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { snapshot, stubPlatform } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await stubPlatform(page);
});

const routes = [
  "/",
  "/hotels",
  "/hotels/hotel-1",
  "/users",
  "/users/user-1",
  "/finance",
  "/finance/payments",
  "/finance/refunds",
  "/finance/payouts",
  "/finance/ledger",
  "/audit",
];
for (const path of routes) {
  test(`shell smoke: ${path}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: "Go to…" })).toBeVisible();
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          )
        )
        .toBe(true);
      if (path === "/" && (width === 375 || width === 1440)) {
        await expect(page.getByText("441,740", { exact: true })).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`overview-${width}.png`),
          fullPage: true,
        });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("mobile navigation, translated shell and keyboard quick jump", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("vi");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("heading", { name: "Tổng quan nền tảng" })
  ).toBeVisible();
  await expect(page).toHaveTitle("Tổng quan · TravelNest Platform");
  const menu = page.getByRole("button", { name: "Mở điều hướng" });
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "Điều hướng nền tảng" });
  await expect(
    drawer.getByRole("link", { name: "Khách sạn", exact: true })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Tìm trang" });
  await expect(search).toBeFocused();
  await search.fill("khách sạn");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/hotels$/);
  await expect(page.getByRole("button", { name: "Đi đến…" })).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("missing snapshot and real zeros are distinct", async ({ page }) => {
  let missing = true;
  await page.route("**/superadmin/overview", (route) =>
    route.fulfill({
      json: {
        data: {
          hotels: { total: 0, byStatus: {} },
          users: { total: 0, byStatus: {} },
          bookings: { total: 0 },
          generatedAt: missing ? null : snapshot.generatedAt,
          stale: missing,
        },
      },
    })
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Snapshot not available yet" })
  ).toBeVisible();
  await expect(
    page.getByText("All-time bookings", { exact: true })
  ).not.toBeVisible();
  missing = false;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("All-time bookings", { exact: true })
  ).toBeVisible();
  await expect(
    page
      .locator(".tn-section")
      .filter({ hasText: "All-time bookings" })
      .getByText("0", { exact: true })
  ).toBeVisible();
});

test("initial failure can retry and failed refresh retains the snapshot", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/superadmin/overview", (route) =>
    route.fulfill(
      fail
        ? {
            status: 503,
            json: { error: { message: "fixture service unavailable" } },
          }
        : { json: { data: snapshot } }
    )
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Could not load the overview"
  );
  await expect(page.getByText("441,740", { exact: true })).not.toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("441,740", { exact: true })).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("previous snapshot");
  await expect(page.getByText("441,740", { exact: true })).toBeVisible();
});

test("loading never displays fabricated zeros", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/superadmin/overview", async (route) => {
    await waiting;
    await route.fulfill({ json: { data: snapshot } });
  });
  await page.goto("/");
  await expect(
    page.getByText("Loading overview…", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("0", { exact: true })).not.toBeVisible();
  release();
  await expect(page.getByText("441,740", { exact: true })).toBeVisible();
});

test("partial permissions protect direct routes and keep recovery stable", async ({
  page,
}) => {
  const overviewCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/superadmin/overview"))
      overviewCalls.push(request.url());
  });
  await page.goto("/?fixture=hotelsonly");
  await expect(page).toHaveURL(/\/403$/);
  await expect(
    page.getByRole("heading", { name: "Access denied" })
  ).toBeVisible();
  await page.getByRole("link", { name: "Open an available page" }).click();
  await expect(page).toHaveURL(/\/hotels$/);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Users", exact: true })
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Go to…" }).click();
  await page.getByRole("combobox", { name: "Find a page" }).fill("users");
  await expect(
    page.getByText("No permitted pages match your search")
  ).toBeVisible();
  expect(overviewCalls).toEqual([]);
});

for (const scenario of ["none", "nonstaff"]) {
  test(`no access recovery: ${scenario}`, async ({ page }) => {
    await page.goto(`/?fixture=${scenario}`);
    await expect(page).toHaveURL(/\/403$/);
    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open an available page" })
    ).not.toBeVisible();
  });
}

for (const locale of ["en", "vi"]) {
  for (const width of [375, 1440]) {
    test(`overview accessibility: ${locale} ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/");
      await page
        .getByRole("combobox", { name: "Language", exact: true })
        .selectOption(locale);
      await expect(
        page.getByText(locale === "vi" ? "441.740" : "441,740", { exact: true })
      ).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      if (locale === "vi" && width === 375) {
        await page.screenshot({
          path: testInfo.outputPath("overview-vi-375.png"),
          fullPage: true,
        });
        for (const screenWidth of [375, 768, 1280, 1440]) {
          await page.setViewportSize({ width: screenWidth, height: 960 });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          ).toBe(true);
        }
      }
    });
  }
}

test("login and forbidden surfaces render without API access", async ({
  page,
}) => {
  await page.goto("/login?fixture=anonymous");
  await expect(
    page.getByRole("heading", { name: "TravelNest Platform" })
  ).toBeVisible();
  await page.goto("/403?fixture=none");
  await expect(
    page.getByRole("heading", { name: "Access denied" })
  ).toBeVisible();
});

for (const status of [401, 403]) {
  test(`revoked API access clears the retained snapshot: ${status}`, async ({
    page,
  }) => {
    let revoked = false;
    await page.route("**/superadmin/overview", (route) =>
      route.fulfill(
        revoked
          ? { status, json: { error: { message: "Access revoked" } } }
          : { json: { data: snapshot } }
      )
    );
    await page.goto("/");
    await expect(page.getByText("441,740", { exact: true })).toBeVisible();
    revoked = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page).toHaveURL(status === 401 ? /\/login$/ : /\/403$/);
    await expect(page.getByText("441,740", { exact: true })).not.toBeVisible();
  });
}

test("support session uses the same permitted shell and masked API data", async ({
  page,
}) => {
  await page.goto("/users?fixture=support");
  await expect(page.getByText("ow•••@…", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Users", exact: true })
  ).toBeVisible();
});

test("mobile drawer and quick jump are accessible when open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("dialog", { name: "Platform navigation" })
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Go to…" }).click();
  await expect(
    page.getByRole("combobox", { name: "Find a page" })
  ).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations
  ).toEqual([]);
});
