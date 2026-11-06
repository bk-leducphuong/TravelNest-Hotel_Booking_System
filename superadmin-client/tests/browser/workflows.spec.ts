import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { stubPlatform, hotel, user, snapshot, payment } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await stubPlatform(page);
});
const waitRecords = async (page: Page) => {
  await expect(page.locator("main h1")).toBeVisible();
  await expect(
    page.getByText("Loading records…", { exact: true })
  ).not.toBeVisible();
};

test("directory Apply is one request, URL survives Back/reload, and detail Back keeps filters", async ({
  page,
}) => {
  const calls: URL[] = [];
  await page.route("**/superadmin/hotels?**", async (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    await route.fulfill({
      json: {
        data: [hotel],
        meta: {
          page: Number(url.searchParams.get("page") || 1),
          limit: 20,
          total: 60,
        },
      },
    });
  });
  await page.goto("/hotels?page=2");
  await waitRecords(page);
  const before = calls.length;
  await page
    .getByRole("textbox", { name: "Hotel name", exact: true })
    .fill("Riverside");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("active");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/search=Riverside/);
  await expect(
    page.getByRole("link", { name: hotel.name, exact: true })
  ).toBeVisible();
  expect(calls.length).toBe(before + 1);
  expect(calls.at(-1)!.searchParams.get("page")).toBe("1");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("link", { name: hotel.name, exact: true }).click();
  await expect(page.locator("main h1")).toHaveText(hotel.name);
  await page.getByRole("link", { name: "Back to hotels" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("textbox", { name: "Hotel name", exact: true })
  ).toHaveValue("Riverside");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Status", exact: true })
  ).toHaveValue("active");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/hotels$/);
  await page.goBack();
  await expect(
    page.getByRole("textbox", { name: "Hotel name", exact: true })
  ).toHaveValue("Riverside");
});

test("a superseded list success or failure cannot replace newer results", async ({
  page,
}) => {
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/superadmin/hotels?**", async (route) => {
    const search = new URL(route.request().url()).searchParams.get("search");
    if (search === "slow") {
      started();
      await waiting;
      await route.fulfill({
        status: 500,
        json: { error: { message: "old request failed" } },
      });
    } else
      await route.fulfill({
        json: {
          data: [{ ...hotel, name: "Newest hotel" }],
          meta: { page: 1, limit: 20, total: 1 },
        },
      });
  });
  await page.goto("/hotels");
  await waitRecords(page);
  const input = page.getByRole("textbox", { name: "Hotel name", exact: true });
  await input.fill("slow");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await requested;
  await input.fill("new");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("link", { name: "Newest hotel" })).toBeVisible();
  const finished = page.waitForEvent("requestfinished", {
    predicate: (request) =>
      new URL(request.url()).searchParams.get("search") === "slow",
  });
  release();
  await finished;
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );
  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Newest hotel" })).toBeVisible();
});

test("empty, no matches, service failure/retry and out-of-range page are distinct", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/superadmin/users?**", (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: {} }
        : { json: { data: [], meta: { page: 1, limit: 20, total: 0 } } }
    )
  );
  await page.goto("/users?page=1");
  await expect(
    page.getByRole("heading", { name: "No records yet" })
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name or email" }).fill("nobody");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching records" })
  ).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert")).toContainText("service is unavailable");
  await expect(
    page.getByRole("heading", { name: "No matching records" })
  ).not.toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching records" })
  ).toBeVisible();
  await page.goto("/users?page=8");
  await expect(
    page.getByText("This page no longer has records.")
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open the last available page" })
    .click();
  await expect(page).toHaveURL(/page=1/);
});

test("invalid URL and draft filters do not send an API query", async ({
  page,
}) => {
  let calls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/superadmin/finance/payments")) calls++;
  });
  await page.goto("/finance/payments?hotelId=bad-id&page=0");
  await expect(page.getByRole("alert")).toContainText("Check the filters");
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await waitRecords(page);
  const before = calls;
  await page.getByRole("textbox", { name: "Currency code" }).fill("US");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert")).toContainText("Check the filters");
  expect(calls).toBe(before);
});

test("finance query uses supported filters and the entire UTC end day", async ({
  page,
}) => {
  let query = new URLSearchParams();
  await page.route("**/superadmin/finance/payments?**", async (route) => {
    query = new URL(route.request().url()).searchParams;
    await route.fulfill({
      json: { data: [payment], meta: { page: 1, limit: 20, total: 1 } },
    });
  });
  await page.goto("/finance/payments");
  await waitRecords(page);
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("cancelled");
  await page.getByRole("textbox", { name: "Currency code" }).fill("usd");
  await page
    .getByRole("textbox", { name: "Hotel ID", exact: true })
    .fill("019b637c-5eb2-7000-8000-000000000001");
  await page.getByLabel("From date (UTC)", { exact: true }).fill("2026-10-01");
  await page
    .getByLabel("Through date (UTC)", { exact: true })
    .fill("2026-10-31");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect.poll(() => query.get("status")).toBe("cancelled");
  expect(query.get("currency")).toBe("USD");
  expect(query.get("from")).toBe("2026-10-01T00:00:00.000Z");
  expect(query.get("to")).toBe("2026-10-31T23:59:59.999Z");
  expect(query.get("hotelId")).toBe("019b637c-5eb2-7000-8000-000000000001");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("vi");
  await expect(page.getByRole("textbox", { name: "Mã tiền tệ" })).toHaveValue(
    "USD"
  );
  expect(query.get("status")).toBe("cancelled");
});

for (const [kind, id, detail] of [
  ["payments", "payment-1", "booking-123"],
  ["refunds", "refund-1", "transaction-456"],
  ["payouts", "payout-1", "Platform fee"],
  ["ledger", "ledger-1", "payment-1"],
]) {
  test(`${kind}: inspect returned record, Escape restores focus and filtering closes drawer`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`/finance/${kind}`);
    await waitRecords(page);
    await page
      .getByRole("textbox", { name: "Currency code" })
      .fill(kind === "refunds" ? "KWD" : kind === "payouts" ? "JPY" : "USD");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await waitRecords(page);
    const trigger = page.getByRole("button", { name: `Inspect record ${id}` });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Record details" });
    await expect
      .poll(() =>
        drawer.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top)
        )
      )
      .toBe(0);
    await expect(
      drawer.getByText(detail!, { exact: true }).first()
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${kind}-record.png`),
      fullPage: false,
    });
    await expect(
      drawer.locator('a[href^="/bookings"], a[href^="/payments"]')
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.goBack(); // The earlier list query restores in the same component and closes inspection.
    await expect(drawer).not.toBeVisible();
  });
}

test("audit exposes complete request/entity references and metadata is text", async ({
  page,
}) => {
  await page.goto("/audit");
  await waitRecords(page);
  await page.getByRole("button", { name: "Inspect record audit-1" }).click();
  const drawer = page.getByRole("dialog", { name: "Audit event details" });
  await expect(
    drawer.getByText("request-long-1234567890", { exact: true })
  ).toBeVisible();
  await expect(drawer.locator("pre")).toContainText(
    "<img src=x onerror=alert(1)>"
  );
  await expect(drawer.locator("img")).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations
  ).toEqual([]);
});

test("finance snapshot remains currency-separated and has missing/error/retry recovery", async ({
  page,
}) => {
  let state = "missing";
  await page.route("**/superadmin/finance/overview", (route) =>
    route.fulfill(
      state === "failed"
        ? { status: 500, json: {} }
        : {
            json: {
              data: {
                gross:
                  state === "missing"
                    ? []
                    : [
                        { currency: "USD", amount: 120.5, count: 1 },
                        { currency: "JPY", amount: 1000, count: 2 },
                      ],
                refunds: [],
                payoutsPaid: [],
                payoutsPending: [],
                generatedAt: state === "missing" ? null : snapshot.generatedAt,
                stale: state === "missing",
              },
            },
          }
    )
  );
  await page.goto("/finance");
  await expect(
    page.getByRole("heading", { name: "Snapshot not available yet" })
  ).toBeVisible();
  state = "valid";
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("$120.50", { exact: true })).toBeVisible();
  await expect(page.getByText("¥1,000", { exact: true })).toBeVisible();
  state = "failed";
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("Refresh failed. Previously loaded data is still shown.")
  ).toBeVisible();
  await expect(page.getByText("$120.50", { exact: true })).toBeVisible();
});

test("detail membership and owner links load the related records", async ({
  page,
}) => {
  await page.route("**/superadmin/users/user-1", (route) =>
    route.fulfill({
      json: {
        data: {
          ...user,
          memberships: [
            {
              hotelId: "hotel-1",
              hotelName: "Related hotel",
              hotelStatus: "active",
              role: "owner",
              isPrimaryOwner: false,
            },
          ],
        },
      },
    })
  );
  await page.route("**/superadmin/hotels/hotel-1", (route) =>
    route.fulfill({
      json: {
        data: {
          ...hotel,
          owner: { id: "user-2", email: "second@example.test" },
        },
      },
    })
  );
  await page.route("**/superadmin/users/user-2", (route) =>
    route.fulfill({
      json: {
        data: {
          ...user,
          id: "user-2",
          fullName: "Second person",
          email: "second@example.test",
        },
      },
    })
  );
  await page.goto("/users/user-1");
  await expect(page.locator("main h1")).toHaveText("Fixture owner");
  await page.getByRole("link", { name: "Related hotel" }).click();
  await page
    .getByRole("link", { name: "second@example.test", exact: true })
    .click();
  await expect(page.locator("main h1")).toHaveText("Second person");
});

test("missing details recover to list and restricted cross-links stay hidden", async ({
  page,
}) => {
  await page.route("**/superadmin/hotels/missing", (route) =>
    route.fulfill({ status: 404, json: {} })
  );
  await page.goto("/hotels/missing");
  await expect(page.getByRole("alert")).toContainText("could not be found");
  await page.getByRole("link", { name: "Back to hotels" }).click();
  await expect(page).toHaveURL(/\/hotels$/);
  await page.goto("/hotels/hotel-1?fixture=hotelsonly");
  await expect(page.locator("main h1")).toHaveText(hotel.name);
  await expect(page.locator('main a[href^="/users/"]')).toHaveCount(0);
});

test("rate-limited reads offer explicit retry, not an automatic retry loop", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/superadmin/audit?**", (route) => {
    calls++;
    return route.fulfill({ status: 429, json: {} });
  });
  await page.goto("/audit");
  await expect(page.getByRole("alert")).toContainText("Too many requests");
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => calls).toBe(2);
});

const screens = [
  ["hotels", "/hotels"],
  ["hotel-detail", "/hotels/hotel-1"],
  ["users", "/users"],
  ["user-detail", "/users/user-1"],
  ["finance", "/finance"],
  ["payments", "/finance/payments"],
  ["refunds", "/finance/refunds"],
  ["payouts", "/finance/payouts"],
  ["ledger", "/finance/ledger"],
  ["audit", "/audit"],
  ["login", "/login?fixture=anonymous"],
  ["forbidden", "/403?fixture=none"],
  ["not-found", "/unknown-page"],
];
for (const [name, path] of screens) {
  test(`${name}: translated desktop/mobile accessibility and visual capture`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path!);
    await waitRecords(page);
    for (const locale of ["en", "vi"] as const) {
      await page
        .getByRole("combobox", { name: "Language", exact: true })
        .selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      for (const width of [375, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          )
          .toBe(true);
        if (width === 375 && (await page.locator("header").count()))
          expect(
            await page
              .locator("header")
              .first()
              .evaluate((element) => element.getBoundingClientRect().height)
          ).toBeLessThanOrEqual(120);
        if (width === 375 || width === 1440)
          expect(
            (
              await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze()
            ).violations
          ).toEqual([]);
        if (
          (locale === "en" && width === 1440) ||
          (locale === "vi" && width === 375)
        )
          await page.screenshot({
            path: testInfo.outputPath(`${name}-${locale}-${width}.png`),
            fullPage: true,
          });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("copy uses the complete returned reference and announces completion", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/audit");
  await waitRecords(page);
  await page.getByRole("button", { name: "Inspect record audit-1" }).click();
  await page
    .getByRole("button", { name: "Copy Request ID", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" })
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "request-long-1234567890"
  );
});

for (const status of [401, 403]) {
  test(`shared list recovery handles non-JSON API ${status}`, async ({
    page,
  }) => {
    let revoke = false;
    await page.route("**/superadmin/finance/payments?**", (route) =>
      route.fulfill(
        revoke
          ? { status, contentType: "text/html", body: "<h1>Access denied</h1>" }
          : {
              json: { data: [payment], meta: { page: 1, limit: 20, total: 1 } },
            }
      )
    );
    await page.goto("/finance/payments");
    await waitRecords(page);
    await page
      .getByRole("button", { name: "Inspect record payment-1" })
      .click();
    await page.keyboard.press("Escape");
    revoke = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page).toHaveURL(status === 401 ? /\/login$/ : /\/403$/);
    await expect(
      page.getByText("payment-1", { exact: true })
    ).not.toBeVisible();
  });
}

test("long record names wrap inside phone detail layouts", async ({ page }) => {
  const longName = "Riverside".repeat(35);
  await page.route("**/superadmin/hotels/hotel-1", (route) =>
    route.fulfill({ json: { data: { ...hotel, name: longName } } })
  );
  await page.setViewportSize({ width: 375, height: 960 });
  await page.goto("/hotels/hotel-1");
  await expect(page.locator("main h1")).toHaveText(longName);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
