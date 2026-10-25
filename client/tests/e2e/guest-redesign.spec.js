// The repository's JS import parser cannot parse this dependency's TypeScript declarations.
// eslint-disable-next-line import/namespace, import/default, import/no-named-as-default, import/no-named-as-default-member
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const searchURL =
  '/search?location=Hanoi&checkInDate=2026-11-10&checkOutDate=2026-11-13&adults=2&children=0&rooms=1&numberOfDays=99';
const room = {
  roomId: 7,
  roomName: 'Garden suite',
  maxGuests: 2,
  roomAmenities: [{ name: 'Wi-Fi' }],
  pricePerNight: 80.25,
  availableRooms: 2,
  roomImageUrls: [],
};
const hotel = {
  hotel_id: '12',
  hotel_name: 'Lake Garden Hotel',
  city: 'Hanoi',
  country: 'Vietnam',
  hotel_class: 4,
  avg_rating: 9.2,
  review_count: 24,
  min_price_for_dates: 240.75,
  primary_image_url: '/fixture-hotel.svg',
};
const details = {
  hotel: {
    id: '12',
    name: 'Lake Garden Hotel',
    address: '12 Lake Road, Hanoi',
    description: 'A quiet stay beside the lake.',
    hotelClass: 4,
    lat: 21.028,
    long: 105.834,
  },
  amenities: [{ id: 1, name: 'Wi-Fi' }],
  policies: [{ id: 1, title: 'Pets', description: 'Pets are not permitted.' }],
  checkInOut: { checkInTime: '14:00', checkOutTime: '12:00' },
  ratingSummary: { overallRating: 9.2, totalReviews: 24 },
  ratingBreakdown: { cleanliness: 9.4 },
  reviews: [],
  rooms: [room],
  images: [{ url: '/fixture-hotel.svg' }],
};
const booking = {
  id: 4,
  booking_code: 'TN123',
  status: 'confirmed',
  check_in_date: '2026-11-10',
  check_out_date: '2026-11-13',
  number_of_guests: 2,
  total_price: 240.75,
  currency: 'USD',
  hotel: {
    name: 'Lake Garden Hotel',
    address: '12 Lake Road, Hanoi',
    image_urls: ['/fixture-hotel.svg'],
  },
  bookingRooms: [{ room_id: 7, quantity: 1, room: { room_name: 'Garden suite' } }],
};
async function fixtures(page, { authenticated = false, locale = 'en' } = {}) {
  await page.clock.setFixedTime(new Date('2026-10-25T08:00:00Z'));
  await page.addInitScript((locale) => localStorage.setItem('language', locale), locale);
  // Intercept the dev module only in the test browser; production auth is unchanged.
  await page.route('**/src/services/keycloak.service*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export const initializeKeycloak=async()=>${authenticated};export const isAuthenticated=()=>${authenticated};export const getAccessToken=async()=>null;export const getClaims=()=>({subject:'fixture',roles:['USER']});export const consumeRedirectPath=()=>null;export const login=async()=>{};export const logout=async()=>{};export const register=async()=>{};export const resetPassword=async()=>{};export const openAccountManagement=async()=>{};`,
    })
  );
  await page.route('**/fixture-hotel.svg', (route) =>
    route.fulfill({
      path: fileURLToPath(
        new URL('../../src/assets/header/anh-phong-khach-san-dep-07.jpg', import.meta.url)
      ),
      contentType: 'image/jpeg',
    })
  );
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith('/auth/session'))
      data = { session: { user: { id: 1, type: 'USER', email: 'guest@example.test' } } };
    else if (path.endsWith('/search/hotels'))
      data = { hotels: [hotel], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    else if (path.endsWith('/search/destinations/autocomplete'))
      data = {
        suggestions: [
          { text: 'Da Nang', payload: { id: 'dn', type: 'city', country_name: 'Vietnam' } },
        ],
      };
    else if (path.endsWith('/user'))
      data = {
        id: 1,
        full_name: 'Test Guest',
        email: 'guest@example.test',
        phone_number: '+84912345678',
      };
    else if (path.endsWith('/user/favorite-hotels'))
      data = [
        {
          hotel_id: '12',
          hotelInformation: {
            name: hotel.hotel_name,
            address: 'Hanoi',
            image_urls: ['/fixture-hotel.svg'],
            overall_rating: 9.2,
          },
        },
      ];
    else if (path.endsWith('/hotels/trending') || path.endsWith('/hotels/recently-viewed'))
      data = [
        {
          id: '12',
          name: hotel.hotel_name,
          address: 'Hanoi',
          primaryImageUrl: '/fixture-hotel.svg',
          ratingSummary: { overallRating: 9.2, totalReviews: 24 },
        },
      ];
    else if (path.endsWith('/search/destinations/trending'))
      data = {
        destinations: [
          {
            id: 'dn',
            displayName: 'Da Nang',
            images: { primary: { objectKey: '/fixture-hotel.svg' } },
          },
        ],
      };
    else if (path.endsWith('/reviews/validate')) data = { isValid: true };
    else if (path.endsWith('/reviews/check')) data = { exists: false };
    else if (path.endsWith('/bookings')) data = [booking];
    else if (path.endsWith('/hotels/12')) data = details;
    else if (path.endsWith('/hotels/12/rooms')) data = [room];
    else if (path.endsWith('/bookings/code/TN123')) data = booking;
    else if (path.endsWith('/hold') && route.request().method() === 'POST')
      data = { holdId: 'fixture-hold', totalPrice: 240.75, expiresAt: '2026-11-09T12:00:00Z' };
    await route.fulfill({ json: { data } });
  });
}
for (const width of [375, 768, 1440]) {
  test(`search fits ${width}px and preserves a three-night stay`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixtures(page);
    await page.goto(searchURL);
    await expect(page.locator('.room-infor')).toHaveCount(1);
    await expect(page.locator('.result-price')).toContainText('3 nights');
    await expect(page.locator('.result-info')).toContainText('Excellent');
    await expect(page.locator('.room-infor')).not.toContainText(
      /Only 4|No prepayment|Standard double/
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    if (width === 375) {
      await page.locator('.mobile-filter').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Show results', exact: true }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
    await page.locator('.hotel-name-search input').fill('does not exist');
    await expect(page.locator('.room-infor')).toHaveCount(0);
    await page.locator('.hotel-name-search input').fill('Lake');
    await expect(page.locator('.room-infor')).toHaveCount(1);
  });
}
test('language changes retain search state and translate the shell', async ({ page }) => {
  await fixtures(page);
  await page.goto(searchURL);
  await expect(page.locator('.room-infor')).toHaveCount(1);
  await page.locator('.guest-language').selectOption('vi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.result-price')).toContainText('3 đêm');
  await expect(page.locator('#guest-destination')).toHaveValue('Hanoi');
});
test('hotel room selection keeps decimal rates and requires refreshed dates', async ({ page }) => {
  await fixtures(page);
  await page.goto(searchURL);
  await page.locator('.result-info a').click();
  await expect(page.getByRole('heading', { name: 'Lake Garden Hotel', exact: true })).toBeVisible();
  await expect(page.locator('.stay-policies')).toContainText('14:00');
  await page.locator('.room-card select').selectOption('2');
  await expect(page.locator('.selected-rate')).toContainText('160.50');
  await page.getByRole('button', { name: 'View all photos', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('.search-bar .el-range-input').nth(1).fill('14/11/2026');
  await page.locator('.search-bar .el-range-input').nth(1).press('Enter');
  await page.locator('.search-bar .el-range-input').nth(1).press('Tab');
  await expect(page.locator('.room-scope-hint')).toContainText('Your search changed');
  await expect(page.locator('.property-booking .guest-button')).toBeDisabled();
});
test('booking details survive reload and confirmation uses its URL code', async ({ page }) => {
  await fixtures(page, { authenticated: true });
  await page.goto('/bookings/TN123');
  await expect(page.locator('.record-banner')).toContainText('TN123');
  await expect(page.locator('.record-banner h1')).toHaveText('Confirmed');
  await expect(page.locator('.record-facts')).toContainText('3 nights');
  await page.reload();
  await expect(page.locator('.record-banner')).toContainText('Lake Garden Hotel');
  await page.goto('/book/complete?bookingCode=TN123');
  await expect(page.locator('.record-banner')).toContainText('TN123');
  await expect(page.locator('main')).not.toContainText(/4338|Chalet Islamabad|PKR|Genius/);
});
test('failed booking load offers recovery and checkout without a selection is safe', async ({
  page,
}) => {
  await fixtures(page, { authenticated: true });
  await page.route('**/bookings/code/TN123', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } })
  );
  await page.goto('/bookings/TN123');
  await expect(page.locator('[role=alert]')).toContainText('couldn’t load');
  await page.goto('/book');
  await expect(
    page.getByRole('heading', { name: 'Choose a room to start your booking' })
  ).toBeVisible();
});

for (const width of [375, 1440]) {
  test(`visual and accessibility review at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await fixtures(page, { authenticated: true });
    for (const [name, url, ready] of [
      ['home', '/', '.guest-hero'],
      ['search', searchURL, '.room-infor'],
      ['hotel', '/hotels/12', '.room-card'],
      ['booking', '/bookings/TN123', '.record-banner'],
    ]) {
      await page.goto(url);
      await expect(page.locator(ready).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        name
      ).toBe(true);
      // The dev-server toolbar is absent from production builds.
      await page.addStyleTag({ content: '#__vue-devtools-container__ {display:none!important}' });
      const audit = await new AxeBuilder({ page })
        .exclude('#__vue-devtools-container__')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, html: n.html, reason: n.failureSummary })),
        })),
        name
      ).toEqual([]);
      if (process.env.GUEST_CAPTURE_DIR)
        await page.screenshot({
          path: `${process.env.GUEST_CAPTURE_DIR}/${name}-${width}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
}

test('room selection creates one hold with dates and quantities', async ({ page }) => {
  await fixtures(page, { authenticated: true });
  await page.goto(searchURL);
  await page.locator('.result-info a').click();
  await page.locator('.room-card select').selectOption('2');
  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/api/v1/hold') && request.method() === 'POST'
  );
  await page.locator('.property-booking .guest-button').click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({
    hotelId: '12',
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-13',
    numberOfGuests: 2,
    rooms: [{ roomId: 7, quantity: 2 }],
    currency: 'USD',
  });
  await expect(page).toHaveURL(/\/book$/);
});

test('destination suggestions retain keyboard selection and valid ARIA references', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto('/');
  const input = page.locator('#guest-destination');
  await input.fill('Da');
  await expect(page.getByRole('option', { name: /Da Nang/ })).toBeVisible();
  await input.press('ArrowDown');
  const id = await input.getAttribute('aria-activedescendant');
  expect(id).toBeTruthy();
  await expect(page.locator(`[id="${id}"]`)).toContainText('Da Nang');
  await input.press('Enter');
  await expect(input).toHaveValue('Da Nang');
});
test('all photos remains available with a full gallery on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await fixtures(page);
  await page.route('**/api/v1/hotels/12?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...details,
          images: Array.from({ length: 5 }, (_, index) => ({
            url: `/fixture-hotel.svg?photo=${index}`,
          })),
        },
      },
    })
  );
  await page.goto('/hotels/12');
  await expect(page.getByRole('button', { name: 'View all photos', exact: true })).toBeVisible();
});

test('checkout edits reach payment and cancellation does not invent a fee', async ({ page }) => {
  await fixtures(page, { authenticated: true });
  await page.goto(searchURL);
  await page.locator('.result-info a').click();
  await page.locator('.room-card select').selectOption('1');
  await page.locator('.property-booking .guest-button').click();
  await page.locator('#checkout-name').fill('Edited Guest');
  await page.locator('#checkout-email').fill('edited@example.test');
  await page.locator('#checkout-phone').fill('invalid');
  expect(await page.locator('#checkout-phone').evaluate(input=>input.checkValidity())).toBe(false);
  await page.locator('#checkout-phone').fill('+84987654321');
  expect(await page.locator('#checkout-phone').evaluate(input=>input.checkValidity())).toBe(true);
  await page.locator('.guest-form button[type=submit]').click();
  await expect(page.locator('.checkout-contact')).toContainText('Edited Guest');
  await page.goto('/bookings/TN123/cancel');
  await expect(page.locator('.cancel-grid')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/USD 0|\$0\.00/);
  await page.route('**/api/v1/bookings/4?*', (route) =>
    route.fulfill({
      json: { data: { refundProcessed: false, cancellationPolicy: { refundAmount: 0 } } },
    })
  );
  await page.locator('input[type=checkbox]').nth(1).check();
  const request = page.waitForRequest(
    (r) => r.method() === 'DELETE' && r.url().includes('/bookings/4')
  );
  await page.locator('.cancel-danger').click();
  expect((await request).url()).toContain('processRefund=true');
  await expect(page.locator('[role=status]')).toContainText(
    'No refund was processed automatically'
  );
});
for (const width of [375, 1440])
  for (const locale of ['en', 'vi']) {
    test(`remaining guest pages fit ${width}px and pass accessibility in ${locale}`, async ({
      page,
    }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 1000 });
      await fixtures(page, { authenticated: true, locale });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const [name, url] of [
        ['home', '/'],
        ['saved', '/saved-hotels'],
        ['trips', '/bookings'],
        ['account', '/account-settings'],
        ['profile', '/account-settings/personal-information'],
        ['security', '/account-settings/security-settings'],
        ['payment-settings', '/account-settings/payment-settings'],
        ['general', '/account-settings/general-settings'],
        ['privacy', '/account-settings/privacy-settings'],
        ['email', '/account-settings/email-settings'],
        ['reviews', '/reviews'],
        ['write-review', '/reviews/review-details?bc=TN123&hid=12&hn=Lake'],
        ['cancellation', '/bookings/TN123/cancel'],
        ['partner', '/join'],
        ['onboarding', '/join/become-a-host'],
        ['login', '/login'],
        ['not-found', '/missing-property'],
      ]) {
        await page.goto(url);
        await expect(page.locator('main').first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: '#__vue-devtools-container__{display:none!important}' });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          name
        ).toBe(true);
        const result = await new AxeBuilder({ page })
          .exclude('#__vue-devtools-container__')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
          })),
          name
        ).toEqual([]);
        if (process.env.GUEST_CAPTURE_DIR)
          await page.screenshot({
            path: `${process.env.GUEST_CAPTURE_DIR}/${name}-${locale}-${width}.png`,
            fullPage: true,
          });
      }
      expect(errors).toEqual([]);
    });
  }

test('checkout expiry and payment initialization failure have recovery paths', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await fixtures(page, { authenticated: true });
  await page.goto(searchURL);
  await page.locator('.result-info a').click();
  await page.locator('.room-card select').selectOption('1');
  await page.locator('.property-booking .guest-button').click();
  await expect(page.locator('#checkout-name')).toHaveValue('Test Guest');
  await page.addStyleTag({content:'#__vue-devtools-container__{display:none!important}'});
  await page.evaluate(() => document.fonts.ready);
  if (process.env.GUEST_CAPTURE_DIR)
    await page.screenshot({
      path: `${process.env.GUEST_CAPTURE_DIR}/checkout-en-375.png`,
      fullPage: true,
    });
  await page.locator('.guest-form button[type=submit]').click();
  await expect(page.locator('.payment-form [role=alert]')).toContainText('unavailable');
  await page.addStyleTag({ content: '#__vue-devtools-container__{display:none!important}' });
  const result = await new AxeBuilder({ page })
    .exclude('#__vue-devtools-container__')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.clock.setFixedTime(new Date('2026-11-10T08:00:00Z'));
  await expect(page.locator('.checkout-expired')).toBeVisible();
  if(process.env.GUEST_CAPTURE_DIR){await page.setViewportSize({width:1440,height:1000});await page.goto('/account-settings');await expect(page.locator('.account-section-grid')).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'#__vue-devtools-container__{display:none!important}'});await page.screenshot({path:`${process.env.GUEST_CAPTURE_DIR}/account-en-1440.png`,fullPage:true});}
});
test('profile and card dialogs support keyboard dismissal', async ({ page }) => {
  await fixtures(page, { authenticated: true });
  await page.goto('/account-settings/personal-information');
  await page.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/account-settings/payment-settings');
  await page.getByRole('button', { name: /Add.*card/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
