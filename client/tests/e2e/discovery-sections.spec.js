import { test, expect } from '@playwright/test';

for (const width of [375, 768, 1440]) {
  test(`homepage discovery layouts work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
      if (!localStorage.getItem('recentSearches')) {
        localStorage.setItem(
          'recentSearches',
          JSON.stringify(
            Array.from({ length: 10 }, (_, id) => ({
              city: `City ${id}`,
              checkIn: '2026-11-10',
              checkOut: '2026-11-12',
            }))
          )
        );
      }
      localStorage.setItem('viewedHotels', JSON.stringify([1, 2, 3, 4, 5, 6]));
    });
    await page.route('**/src/services/keycloak.service*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export const initializeKeycloak=async()=>false;export const isAuthenticated=()=>false;export const getAccessToken=async()=>null;export const getClaims=()=>null;export const consumeRedirectPath=()=>null;export const login=async()=>{};export const logout=async()=>{};export const register=async()=>{};export const resetPassword=async()=>{};export const openAccountManagement=async()=>{};',
      })
    );
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.endsWith('/hotels/trending') || path.endsWith('/hotels/batch')) {
        data = Array.from({ length: 10 }, (_, id) => ({
          id,
          name: `Hotel ${id}`,
          address: 'Hanoi',
        }));
      } else if (path.endsWith('/search/destinations/trending')) {
        data = {
          destinations: Array.from({ length: 5 }, (_, id) => ({
            id: id + 1,
            displayName: `Destination ${id}`,
          })),
        };
      }
      return route.fulfill({ json: { data } });
    });
    await page.goto('/');
    const trending = page.getByRole('region', { name: 'Trending Hotels', exact: true });
    await expect(trending.locator('.guest-property')).toHaveCount(10);
    const track = trending.locator('.discovery-items');
    await expect(
      trending.getByRole('button', { name: 'Next cards in Trending Hotels', exact: true })
    ).toBeEnabled();
    await trending
      .getByRole('button', { name: 'Next cards in Trending Hotels', exact: true })
      .click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await trending.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect(trending.locator('.guest-property')).toHaveCount(4);
    await trending.getByRole('button', { name: 'Show more', exact: true }).click();
    await expect(trending.locator('.guest-property')).toHaveCount(8);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.reload();
    await expect(trending.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(trending.locator('.guest-property')).toHaveCount(4);
    const recent = page.getByRole('region', { name: 'Continue your search', exact: true });
    await expect(recent.getByRole('button', { name: 'Row', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await recent.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect(recent.locator('article')).toHaveCount(4);
    await recent.getByRole('button', { name: 'Remove search for City 0', exact: true }).click();
    await expect(recent.locator('article').first()).toContainText('City 1');
  });
}
