/**
 * TravelNest — booking funnel load test (hold → pending booking).
 *
 * EXPERIMENTAL and WRITE-CAPABLE. It creates real rows: one room hold and one
 * pending-payment booking per iteration. It will not run unless BOTH of these
 * are set, so it cannot fire by accident:
 *
 *   AUTH_TOKEN    a Keycloak access token for a guest account
 *   ALLOW_WRITES  must be exactly "true"
 *
 *   AUTH_TOKEN=... ALLOW_WRITES=true make load-test-booking
 *
 * What it measures: `booking_checkout_duration_seconds` (room hold created →
 * booking created), the first stage of the funnel dashboard. The later stages
 * (`booking_confirmation_*`) need a real Stripe payment + webhook and are out
 * of scope here.
 *
 * Two deliberate constraints:
 *
 *   1. Throughput is capped at roughly one booking per 15 s. `POST /hold` and
 *      `POST /bookings` carry the write limiter (60 requests / 15 min), so a
 *      burst would be throttled rather than measured. A 10-minute run creates
 *      ~35 bookings — enough for a p95, small enough to clean up.
 *   2. The bookable date window is **discovered**, not assumed. Inventory only
 *      extends a few weeks out (local: 30 days, prod: no availability at 60),
 *      so a fixed "30–119 days ahead" spread produced zero bookable dates and
 *      an empty run. `setup()` probes the next four weeks and only books dates
 *      that actually return hotels.
 *
 * Because direct-access grants are disabled on the `travelnest-web` Keycloak
 * client, tokens come from the dedicated `travelnest-loadtest` client — see
 * ../README.md and ../scripts/get-token.sh.
 */

import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || 'https://api.trestay.com').replace(/\/+$/, '');
const API = `${BASE_URL}/api/v1`;
const CITY = __ENV.CITY || 'Hanoi';
const DURATION = __ENV.DURATION || '10m';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;
const ALLOW_WRITES = __ENV.ALLOW_WRITES === 'true';
/** Optional rate-limiter exemption; see read-path.js. */
const BYPASS_TOKEN = __ENV.BYPASS_TOKEN || '';

/**
 * Pay each booking immediately, so `booking_confirmation_duration_seconds`
 * reflects a guest who pays right away instead of one who leaves the checkout
 * page open. Requires a Stripe **test-mode** secret key; it never leaves the
 * machine running this suite.
 */
const PAY_NOW = __ENV.PAY_NOW === 'true';
const STRIPE_SECRET_KEY = __ENV.STRIPE_SECRET_KEY || '';
const STRIPE_CONFIRM_TIMEOUT_S = Number(__ENV.STRIPE_CONFIRM_TIMEOUT_S || 25);

/** Days from today to start looking for bookable inventory. */
const WINDOW_START_DAYS = Number(__ENV.WINDOW_START_DAYS || 2);
/** How many days to probe. Inventory rarely extends beyond a few weeks. */
const WINDOW_DAYS = Number(__ENV.WINDOW_DAYS || 28);

const rateLimited = new Counter('rate_limited');
const funnelBroken = new Counter('funnel_broken');

let consecutive429 = 0;

function guard() {
  if (!ALLOW_WRITES) {
    exec.test.abort(
      'Refusing to run: ALLOW_WRITES is not "true". This suite creates real ' +
        'holds and bookings.'
    );
  }
  if (!AUTH_TOKEN) {
    exec.test.abort(
      'Missing AUTH_TOKEN. The funnel flow needs an authenticated guest token; ' +
        'see loadtest/README.md for how to mint one.'
    );
  }
  if (PAY_NOW && !STRIPE_SECRET_KEY) {
    exec.test.abort('PAY_NOW=true needs STRIPE_SECRET_KEY (test mode).');
  }
}

guard();

function isoDate(daysFromNow) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    booking_funnel: {
      executor: 'constant-vus',
      vus: 1,
      duration: DURATION
    }
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    rate_limited: ['count<1'],
    funnel_broken: ['count<3'],
    'http_req_duration{name:funnel-search}': ['p(95)<2000'],
    'http_req_duration{name:funnel-rooms}': ['p(95)<1500'],
    'http_req_duration{name:create-hold}': ['p(95)<3000'],
    'http_req_duration{name:create-booking}': ['p(95)<5000']
  }
};

function authHeaders() {
  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Optional rate-limiter exemption (see read-path.js): an ephemeral generator
  // gets a new IP every run, so the token replaces an IP allowlist entry.
  if (BYPASS_TOKEN) {
    headers['X-Load-Test-Token'] = BYPASS_TOKEN;
  }

  return { headers };
}

function request(method, url, name, body, extraHeaders) {
  const params = {
    headers: { ...authHeaders().headers, ...extraHeaders },
    tags: { name }
  };
  const response =
    method === 'GET' ? http.get(url, params) : http.post(url, JSON.stringify(body), params);

  if (response.status === 429) {
    rateLimited.add(1);
    consecutive429 += 1;
    if (consecutive429 >= 2) {
      exec.test.abort(
        'HTTP 429 from the API rate limiter. Add the generator to ' +
          'RATE_LIMIT_ALLOWLIST (see loadtest/README.md) and run again.'
      );
    }
  } else {
    consecutive429 = 0;
  }

  return response;
}

/** First defined value among the candidate paths, or null. */
function pick(body, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), body);
    if (value) return value;
  }
  return null;
}

function json(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

function hotelsFor(checkIn, checkOut, name) {
  const response = request(
    'GET',
    `${API}/search/hotels?city=${encodeURIComponent(CITY)}` +
      `&checkIn=${checkIn}&checkOut=${checkOut}&adults=1&rooms=1`,
    name
  );

  if (response.status !== 200) return [];
  return json(response)?.data?.hotels ?? [];
}

/**
 * Probe the window once and keep the offsets that actually have hotels.
 *
 * Booking a date with no inventory would measure "sold out", not checkout
 * latency, so those dates are excluded before the run starts.
 */
export function setup() {
  guard();

  const offsets = [];

  for (let offset = WINDOW_START_DAYS; offset < WINDOW_START_DAYS + WINDOW_DAYS; offset += 1) {
    const hotels = hotelsFor(isoDate(offset), isoDate(offset + 2), 'setup-search');
    if (hotels.length > 0) offsets.push(offset);
  }

  if (offsets.length === 0) {
    exec.test.abort(
      `setup: no bookable inventory for "${CITY}" in the next ${WINDOW_DAYS} days. ` +
        'Seed inventory, pick another CITY, or widen WINDOW_START_DAYS/WINDOW_DAYS.'
    );
  }

  console.log(
    `booking-funnel: target ${BASE_URL} — ${offsets.length} bookable dates ` +
      `(+${offsets[0]}d .. +${offsets[offsets.length - 1]}d), ${DURATION} run`
  );

  return { offsets };
}

/**
 * Create a PaymentIntent for a pending booking and confirm it with a Stripe
 * test payment method, then wait for the webhook to flip the booking.
 *
 * The confirmation interval the API records runs from the room hold, so paying
 * immediately is what makes `booking_confirmation_duration_seconds` realistic.
 * Returns the observed seconds from the client side, or null.
 */
function payBooking(bookingId) {
  const started = Date.now();

  const intent = request(
    'POST',
    `${API}/bookings/${bookingId}/payment-intent`,
    'create-intent',
    {}
  );
  const paymentIntentId = json(intent)?.data?.paymentIntentId;

  if (!paymentIntentId) {
    funnelBroken.add(1);
    return null;
  }

  const confirm = http.post(
    `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`,
    { payment_method: 'pm_card_visa' },
    {
      headers: {
        Authorization: `Basic ${encoding.b64encode(`${STRIPE_SECRET_KEY}:`)}`
      },
      tags: { name: 'stripe-confirm' }
    }
  );

  check(confirm, { 'stripe-confirm: 200': (r) => r.status === 200 });

  // The booking flips to `confirmed` when the webhook lands, which can take a
  // few seconds. Poll rather than assuming it is instant.
  for (let waited = 0; waited < STRIPE_CONFIRM_TIMEOUT_S; waited += 1) {
    const current = request('GET', `${API}/bookings/${bookingId}`, 'poll-booking');
    const status = json(current)?.data?.booking?.status ?? json(current)?.data?.status;
    if (status === 'confirmed') {
      return (Date.now() - started) / 1000;
    }
    sleep(1);
  }

  funnelBroken.add(1);
  return null;
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;

  // Rotate over the dates that had inventory at setup time.
  const offset = data.offsets[iteration % data.offsets.length];
  const checkIn = isoDate(offset);
  const checkOut = isoDate(offset + 2);

  // Mirrors a real guest: search, open a hotel, read its rooms, hold, book.
  const hotels = hotelsFor(checkIn, checkOut, 'funnel-search');
  if (hotels.length === 0) {
    // Inventory can be consumed between setup and now; skip this date.
    funnelBroken.add(1);
    sleep(15);
    return;
  }

  const hotel = hotels[iteration % hotels.length];

  const rooms = request(
    'GET',
    `${API}/hotels/${hotel.hotel_id}/rooms?checkInDate=${checkIn}&checkOutDate=${checkOut}` +
      '&numberOfRooms=1&numberOfGuests=1',
    'funnel-rooms'
  );

  const available = json(rooms)?.data ?? [];
  if (rooms.status !== 200 || available.length === 0) {
    funnelBroken.add(1);
    sleep(15);
    return;
  }

  const room = available[iteration % available.length];

  const hold = request('POST', `${API}/hold`, 'create-hold', {
    hotelId: hotel.hotel_id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
    rooms: [{ roomId: room.roomId, quantity: 1 }],
    currency: 'USD'
  });

  check(hold, {
    'create-hold: 200/201': (r) => r.status === 200 || r.status === 201
  });

  const holdId = pick(json(hold), ['data.holdId', 'data.hold.holdId', 'data.hold.id', 'data.id']);

  if (!holdId) {
    funnelBroken.add(1);
    sleep(15);
    return;
  }

  const booking = request(
    'POST',
    `${API}/bookings`,
    'create-booking',
    {
      holdId,
      guestDetails: {
        fullName: 'Load Test Guest',
        email: 'loadtest@example.com',
        phoneNumber: '+10000000000',
        country: 'VN',
        bookingFor: 'self',
        travellingForWork: false
      },
      specialRequests: 'k6 load test — safe to cancel'
    },
    // The endpoint rejects writes without one. The hold id is already unique per
    // iteration, so retrying the same booking stays idempotent.
    { 'Idempotency-Key': holdId }
  );

  check(booking, {
    'create-booking: 200/201': (r) => r.status === 200 || r.status === 201
  });

  const bookingId = pick(json(booking), [
    'data.bookingId',
    'data.booking.bookingId',
    'data.booking.id',
    'data.id'
  ]);

  if (bookingId) {
    if (PAY_NOW) {
      payBooking(bookingId);
    } else {
      request('GET', `${API}/bookings/${bookingId}`, 'get-booking');
    }
  }

  // Paying already waits for the webhook, so the pacing sleep stays short.
  sleep(PAY_NOW ? 1 : 15);
}
