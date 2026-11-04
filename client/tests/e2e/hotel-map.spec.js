import { test, expect } from '@playwright/test';

for (const mobile of [false, true]) {
  test(`map area search and selection (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('language', 'en'));
    await page.route('**/src/services/keycloak.service*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export const initializeKeycloak=async()=>false;export const isAuthenticated=()=>false;export const getAccessToken=async()=>null;export const getClaims=()=>({});export const consumeRedirectPath=()=>null;export const login=async()=>{};export const logout=async()=>{};export const register=async()=>{};export const resetPassword=async()=>{};export const openAccountManagement=async()=>{};',
      })
    );
    const hotel = {
      hotel_id: 'h1',
      hotel_name: 'Map Hotel',
      latitude: 10.78,
      longitude: 106.7,
      currency: 'USD',
      min_price_for_dates: 90,
      min_price_for_requested_rooms: 180,
    };
    const areaHotel = { ...hotel, hotel_id: 'h2', hotel_name: 'Area Hotel', latitude: 10.781 };
    let mapRequests = 0;
    await page.route('**/api/v1/**', (route) => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname.endsWith('/search/hotels/map')) {
        mapRequests++;
        expect(url.searchParams.has('city')).toBe(false);
        expect(url.searchParams.get('rooms')).toBe('2');
        data = { hotels: [areaHotel], total: 1, hasMore: false };
      } else if (url.pathname.endsWith('/search/hotels'))
        data = { hotels: [hotel], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      return route.fulfill({ json: { success: true, data } });
    });
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto(
      '/search?location=Hanoi&checkInDate=2099-01-01&checkOutDate=2099-01-03&adults=2&children=0&rooms=2'
    );
    await page
      .locator('button')
      .filter({ hasText: /show on map|view on map|map view/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.hotel-price-marker')).toHaveCount(1);
    await expect(dialog.locator('.hotel-price-marker')).toContainText('180');
    await dialog.locator('.hotel-price-marker').click();
    await expect(dialog.locator('.hotel-card.selected')).toContainText('Area Hotel');
    const canvas = dialog.locator('.leaflet-container');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + 100, { steps: 10 });
    await page.mouse.up();
    await expect(dialog.getByText('Map moved. Search this area to update results.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Search this area', exact: true }).click();
    await expect.poll(() => mapRequests).toBe(2);
    await page.screenshot({ path: `/tmp/travelnest-map-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Map Hotel', { exact: true }).first()).toBeVisible();
  });
}
