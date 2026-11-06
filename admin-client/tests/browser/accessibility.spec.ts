import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { stubConsole } from "./support/console";

for (const path of [
  "/",
  "/rooms",
  "/rooms/new",
  "/rooms/room-1",
  "/bookings",
  "/bookings/booking-1",
  "/reservations",
  "/availability",
  "/properties",
  "/properties/hotel-1",
  "/reviews",
  "/reviews/review-1",
  "/payments",
  "/payments/transactions/transaction-1",
  "/payments/refunds",
  "/payouts",
  "/payouts/payout-1",
  "/payouts/connected-accounts",
  "/settings",
  "/settings/team",
]) {
  test(`${path}: accessible content and controls`, async ({ page }) => {
    await stubConsole(page);
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    for (const language of ["en", "vi"]) {
      if (language === "vi") {
        await page.getByRole("button", { name: "Account menu" }).click();
        await page.getByRole("menuitem", { name: "Tiếng Việt" }).click();
        await expect(page.getByRole("menu")).toBeHidden();
        await page.setViewportSize({ width: 375, height: 960 });
      }
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        }))
      ).toEqual([]);
    }
  });
}
