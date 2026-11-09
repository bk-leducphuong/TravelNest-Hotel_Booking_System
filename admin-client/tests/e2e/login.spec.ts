import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders the Keycloak sign-in entry point", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Trestay Admin" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with Trestay" })
    ).toBeVisible();
  });
});
