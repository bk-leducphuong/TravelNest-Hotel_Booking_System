import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders email/password inputs and buttons", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "TravelNest Admin" })
    ).toBeVisible();

    await expect(page.getByPlaceholder("admin@travelnest.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Twitter/i })).toBeVisible();
  });

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  (adminEmail && adminPassword ? test : test.skip)(
    "logs in successfully with valid admin credentials",
    async ({ page }) => {
      await page.goto("/login");

      await page.getByPlaceholder("admin@travelnest.com").fill(adminEmail!);
      await page.getByPlaceholder("••••••••").fill(adminPassword!);
      await page.getByRole("button", { name: "Login" }).click();

      await page.waitForURL("**/");

      await expect(
        page.getByText("TravelNest Admin", { exact: true })
      ).toBeVisible();
      await expect(page.getByText(adminEmail!)).toBeVisible();
    }
  );
});
