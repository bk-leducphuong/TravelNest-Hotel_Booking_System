/**
 * Shared helpers for the guest-flow e2e suite.
 *
 * Everything here talks to the *running* stack over HTTP:
 *  - Keycloak ROPC for bearer tokens
 *  - the guest API for discovery / holds / bookings / payments
 *  - the Stripe API directly to confirm PaymentIntents (webhook goes via
 *    `stripe listen`).
 */
const axios = require('axios');

const BASE_URL = () => process.env.E2E_BASE_URL;
const KC = () => ({
  url: process.env.E2E_KEYCLOAK_URL,
  realm: process.env.E2E_KEYCLOAK_REALM,
  client: process.env.E2E_KEYCLOAK_CLIENT,
});

const GUEST_A = () => ({
  username: process.env.E2E_USERNAME,
  password: process.env.E2E_PASSWORD,
});
const GUEST_B = () => ({
  username: process.env.E2E_USERNAME_B,
  password: process.env.E2E_PASSWORD_B,
});

/** UTC-safe `YYYY-MM-DD` at +offsetDays from today. */
function dateOnly(offsetDays) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Default valid booking window — randomised so repeated runs use fresh inventory. */
function defaultWindow() {
  const base = 14 + Math.floor(Math.random() * 56); // 14..69 days ahead
  return { checkIn: dateOnly(base), checkOut: dateOnly(base + 2) };
}

function uuid() {
  return crypto.randomUUID();
}

/** Exchange username/password for a Keycloak access token (Direct Access Grants). */
async function getToken(user = GUEST_A()) {
  const { url, realm, client } = KC();
  const res = await axios.post(
    `${url}/realms/${realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: client,
      username: user.username,
      password: user.password,
      scope: 'openid',
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      validateStatus: () => true,
    }
  );
  if (!res.data || !res.data.access_token) {
    throw new Error(
      `Keycloak ROPC failed for ${user.username}: HTTP ${res.status} ${JSON.stringify(res.data)}`
    );
  }
  return res.data.access_token;
}

/** HTTP client that never throws on non-2xx (assert on `.status` instead). */
function api(token, extraHeaders = {}) {
  return axios.create({
    baseURL: BASE_URL(),
    timeout: 25000,
    validateStatus: () => true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });
}

/**
 * Discover a bookable hotel + room from the live dataset.
 * Falls back through the first few search hits until a room is available.
 */
async function discoverHotelRoom(token, { checkIn, checkOut } = defaultWindow()) {
  const client = api(token);
  const city = process.env.E2E_CITY || 'Ha Noi';
  const search = await client.get('/search/hotels', {
    params: { city, checkIn, checkOut, adults: 1, rooms: 1 },
  });
  const hotels = (search.data && search.data.data && search.data.data.hotels) || [];
  if (!hotels.length) {
    throw new Error(`No hotels found for city="${city}" (HTTP ${search.status})`);
  }

  // Shuffle so repeated runs hit different hotels/rooms and don't exhaust the
  // same inventory slice.
  const shuffled = hotels.slice().sort(() => Math.random() - 0.5);

  for (const hotel of shuffled.slice(0, 12)) {
    const hotelId = hotel.id || hotel.hotel_id;
    const rooms = await client.get(`/hotels/${hotelId}/rooms`, {
      params: {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfRooms: 1,
        numberOfGuests: 2,
      },
    });
    const list = (rooms.data && (rooms.data.data || rooms.data.rooms)) || [];
    if (Array.isArray(list) && list.length) {
      const room = list[Math.floor(Math.random() * list.length)];
      return { hotelId, roomId: room.roomId || room.room_id, checkIn, checkOut, city };
    }
  }
  throw new Error(`No room availability found for city="${city}"`);
}

/**
 * Discover a fresh hotel/room + create a hold, retrying with a new random
 * window if that slice of inventory is exhausted.
 */
async function freshHold(token) {
  let lastResponse;
  for (let attempt = 0; attempt < 4; attempt++) {
    const context = await discoverHotelRoom(token);
    lastResponse = await createHold(api(token), context);
    if (lastResponse.status === 201) {
      return {
        context,
        holdId: lastResponse.data.data.holdId,
        client: api(token),
      };
    }
  }
  throw new Error(
    `Could not create a hold after several attempts (last HTTP ${lastResponse && lastResponse.status})`
  );
}

/** Create a hold. Returns the raw axios response. */
function createHold(client, { hotelId, roomId, checkIn, checkOut, guests = 1, rooms }) {
  return client.post('/hold', {
    hotelId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: guests,
    rooms: rooms || [{ roomId, quantity: 1 }],
  });
}

/** Create a booking from a hold. `idempotencyKey` is required by the API. */
function createBooking(client, holdId, { idempotencyKey, body = {} } = {}) {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
  return client.post('/bookings', { holdId, ...body }, { headers });
}

/** Extract the PaymentIntent id from a Stripe client_secret. */
function paymentIntentIdFromSecret(clientSecret) {
  return typeof clientSecret === 'string' ? clientSecret.split('_secret_')[0] : null;
}

/** Confirm a PaymentIntent server-side with Stripe's test card (triggers webhook). */
async function confirmPaymentIntent(paymentIntentId, { paymentMethod = 'pm_card_visa' } = {}) {
  const res = await axios.post(
    `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`,
    new URLSearchParams({ payment_method: paymentMethod }).toString(),
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 20000,
      validateStatus: () => true,
    }
  );
  return res;
}

/** Read `status` from a GET /bookings/:id response, tolerating a couple of shapes. */
function bookingStatusOf(res) {
  const d = res && res.data && res.data.data;
  if (!d) return undefined;
  return d.status || (d.booking && d.booking.status);
}

/** Poll a booking until `predicate(status)` is true or the deadline passes. */
async function waitForBookingStatus(client, bookingId, predicate, { timeoutMs = 25000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    const res = await client.get(`/bookings/${bookingId}`);
    last = res;
    const status = bookingStatusOf(res);
    if (status && predicate(status)) return { status, res };
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { status: bookingStatusOf(last), res: last, timedOut: true };
}

module.exports = {
  BASE_URL,
  KC,
  GUEST_A,
  GUEST_B,
  dateOnly,
  defaultWindow,
  uuid,
  getToken,
  api,
  discoverHotelRoom,
  createHold,
  freshHold,
  createBooking,
  paymentIntentIdFromSecret,
  confirmPaymentIntent,
  bookingStatusOf,
  waitForBookingStatus,
};
