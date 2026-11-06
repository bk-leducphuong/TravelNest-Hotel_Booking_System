import { test, expect } from '@playwright/test';

for (const width of [375, 1440]) {
  test(`section errors stay local and retry recovers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('language', 'en'));
    await page.route('**/src/services/keycloak.service*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export const initializeKeycloak=async()=>false;export const isAuthenticated=()=>false;export const getAccessToken=async()=>null;export const getClaims=()=>null;export const consumeRedirectPath=()=>null;export const login=async()=>{};export const logout=async()=>{};export const register=async()=>{};export const resetPassword=async()=>{};export const openAccountManagement=async()=>{};',
      })
    );
    let failing = true;
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/hotels/trending')) {
        return route.fulfill(
          failing
            ? { status: 500, json: { message: 'Internal database failure' } }
            : { json: { data: [{ id: 1, name: 'Recovered hotel', address: 'Hanoi' }] } }
        );
      }
      return route.fulfill({
        json: {
          data: path.endsWith('/search/destinations/trending')
            ? { destinations: [{ id: 1, displayName: 'Hanoi' }] }
            : [],
        },
      });
    });
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Trending Hotels', exact: true });
    await expect(section.getByRole('alert')).toContainText('We couldn’t load this section');
    await expect(section.locator('[role="alert"] svg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hanoi', exact: true })).toBeVisible();
    await expect(page.locator('.Vue-Toastification__toast')).toHaveCount(0);
    await expect(page.getByText('Internal database failure')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    failing = false;
    await section.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(section.getByRole('alert')).toHaveCount(0);
    await expect(section).toContainText('Recovered hotel');
    await page.getByRole('button', { name: 'Search', exact: true }).first().click();
    await expect(page.getByRole('alert')).toContainText('We couldn’t complete your search');
    await expect(page.getByRole('alert')).toContainText(
      'Choose a destination, future travel dates'
    );
  });
}
