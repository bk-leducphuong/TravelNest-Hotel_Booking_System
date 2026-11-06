import { test, expect } from "@playwright/test";

/**
 * The console is behind Keycloak, so the only fully unauthenticated surface is
 * the login page. Frontend authenticated behavior has a separate isolated
 * fixture suite; real identity-provider integration requires a seeded environment.
 */
test.describe("Login page", () => {
  test("renders the Keycloak sign-in entry point", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "TravelNest Platform" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with TravelNest" })
    ).toBeVisible();
  });
});
