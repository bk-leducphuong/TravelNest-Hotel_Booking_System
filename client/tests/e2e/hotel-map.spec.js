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
    const rooms = mobile ? 1 : 2;
    const areaHotel = { ...hotel, hotel_id: 'h2', hotel_name: 'Area Hotel', latitude: 10.781 };
    const mapHotels = [areaHotel];
    if (!mobile) {
      for (let i = 1; i <= 10; i++)
        mapHotels.push({
          ...hotel,
          hotel_id: `extra-${i}`,
          hotel_name: `Nearby Hotel ${i}`,
          latitude: 10.781 + (Math.floor((i - 1) / 4) + 1) * 0.004,
          longitude: 106.7 + (((i - 1) % 4) + 1) * 0.008,
        });
    }
    let mapRequests = 0;
    await page.route('**/api/v1/**', (route) => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname.endsWith('/search/hotels/map')) {
        mapRequests++;
        expect(url.searchParams.has('city')).toBe(false);
        expect(url.searchParams.get('rooms')).toBe(String(rooms));
        data = { hotels: mapHotels, total: mapHotels.length, hasMore: false };
      } else if (url.pathname.endsWith('/search/hotels'))
        data = { hotels: [hotel], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      return route.fulfill({ json: { success: true, data } });
    });
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto(
      `/search?location=Hanoi&checkInDate=2099-01-01&checkOutDate=2099-01-03&adults=2&children=0&rooms=${rooms}`
    );
    await page
      .locator('button')
      .filter({ hasText: /show on map|view on map|map view/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.hotel-price-marker')).toHaveCount(mapHotels.length);
    await expect(dialog.locator('.hotel-price-marker[title="Area Hotel"]')).toContainText('180');
    await expect(dialog.locator('.map-toolbar')).toContainText(
      `2 guests · ${rooms} ${rooms === 1 ? 'room' : 'rooms'}`
    );
    const card = dialog.locator('.hotel-card').first();
    const favorite = card.getByRole('button', { name: 'Save to saved hotels', exact: true });
    // Keep the absolutely positioned shared favorite control inside this card's actions.
    await expect(favorite).toBeVisible();
    const cardBox = await card.boundingBox();
    const favoriteBox = await favorite.boundingBox();
    expect(favoriteBox.x).toBeGreaterThanOrEqual(cardBox.x);
    expect(favoriteBox.y).toBeGreaterThanOrEqual(cardBox.y);
    expect(favoriteBox.x + favoriteBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
    expect(favoriteBox.y + favoriteBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height);
    await dialog.locator('.hotel-price-marker[title="Area Hotel"]').click();
    await expect(dialog.locator('.hotel-card.selected')).toContainText('Area Hotel');
    const canvas = dialog.locator('.leaflet-container');
    if (!mobile) {
      const lastCard = dialog.locator('.hotel-card').last();
      const lastMarker = dialog.locator('.hotel-price-marker[title="Nearby Hotel 10"]');
      await lastMarker.hover();
      await expect(lastCard).toHaveClass(/highlighted/);
      await expect
        .poll(async () => {
          const listBox = await dialog.locator('.hotel-list').boundingBox();
          const cardBox = await lastCard.boundingBox();
          return cardBox.y >= listBox.y && cardBox.y + cardBox.height <= listBox.y + listBox.height;
        })
        .toBe(true);
      // Move the map far enough to hide that marker, then hover its card.
      const zoom = dialog.locator('.leaflet-control-zoom-in');
      await zoom.click();
      await zoom.click();
      const mapBox = await canvas.boundingBox();
      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBox.x + 25, mapBox.y + 25, { steps: 10 });
      await page.mouse.up();
      await expect
        .poll(async () => {
          const mapBounds = await canvas.boundingBox();
          const markerBounds = await lastMarker.boundingBox();
          return (
            markerBounds.x < mapBounds.x ||
            markerBounds.x > mapBounds.x + mapBounds.width ||
            markerBounds.y < mapBounds.y ||
            markerBounds.y > mapBounds.y + mapBounds.height
          );
        })
        .toBe(true);
      await lastCard.hover();
      await expect
        .poll(async () => {
          const mapBounds = await canvas.boundingBox();
          const markerBounds = await lastMarker.boundingBox();
          return (
            markerBounds.x >= mapBounds.x &&
            markerBounds.x + markerBounds.width <= mapBounds.x + mapBounds.width &&
            markerBounds.y >= mapBounds.y &&
            markerBounds.y + markerBounds.height <= mapBounds.y + mapBounds.height
          );
        })
        .toBe(true);
      expect(mapRequests).toBe(1);
    }
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + 100, { steps: 10 });
    await page.mouse.up();
    await expect(dialog.getByText('Map moved. Search this area to update results.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Search this area', exact: true }).click();
    await expect.poll(() => mapRequests).toBe(2);
    await page.screenshot({ path: `/tmp/travelnest-map-${mobile ? 'mobile' : 'desktop'}.png` });
    await dialog.locator('.el-dialog__headerbtn').click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Map Hotel', { exact: true }).first()).toBeVisible();
  });
}
