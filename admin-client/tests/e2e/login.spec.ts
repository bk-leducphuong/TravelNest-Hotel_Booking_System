import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders the Keycloak sign-in entry point", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "TravelNest Admin" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with TravelNest" })
    ).toBeVisible();
  });
});
