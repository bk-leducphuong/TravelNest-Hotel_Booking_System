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
 *   2. Each iteration books a different check-in date (offset 30–119 days) so
 *      the run spreads across inventory instead of exhausting one room-day
 *      and turning the tail into "sold out" responses.
 *
 * Because direct-access grants are disabled on the `travelnest-web` Keycloak
 * client, obtaining AUTH_TOKEN needs a dedicated load-test client or a
 * browser session. See loadtest/README.md.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || 'https://api.trestay.com').replace(/\/+$/, '');
const API = `${BASE_URL}/api/v1`;
const CITY = __ENV.CITY || 'Hanoi';
const DURATION = __ENV.DURATION || '10m';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;
const ALLOW_WRITES = __ENV.ALLOW_WRITES === 'true';

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
      duration: DURATION,
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    rate_limited: ['count<1'],
    funnel_broken: ['count<3'],
    'http_req_duration{name:create-hold}': ['p(95)<3000'],
    'http_req_duration{name:create-booking}': ['p(95)<5000'],
  },
};

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
}

function request(method, url, name, body) {
  const params = { ...authHeaders(), tags: { name } };
  const response =
    method === 'GET' ? http.get(url, params) : http.post(url, JSON.stringify(body), params);

  if (response.status === 429) {
    rateLimited.add(1);
    consecutive429 += 1;
    if (consecutive429 >= 2) {
      exec.test.abort(
        'HTTP 429 from the API rate limiter. Set RATE_LIMIT_ENABLED=false on ' +
          'the target for the duration of the run.'
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

/** Resolve one bookable room to bootstrap the run. */
export function setup() {
  guard();

  const checkIn = isoDate(30);
  const checkOut = isoDate(32);
  const search = request(
    'GET',
    `${API}/search/hotels?city=${encodeURIComponent(CITY)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=1&rooms=1`,
    'setup-search'
  );

  if (search.status !== 200) {
    exec.test.abort(`setup: search returned HTTP ${search.status}`);
  }

  const hotels = json(search)?.data?.hotels ?? [];
  if (hotels.length === 0) {
    exec.test.abort(`setup: no hotels for "${CITY}"`);
  }

  const hotelId = hotels[0].hotel_id;
  const rooms = request(
    'GET',
    `${API}/hotels/${hotelId}/rooms?checkInDate=${checkIn}&checkOutDate=${checkOut}` +
      '&numberOfRooms=1&numberOfGuests=1',
    'setup-rooms'
  );

  const roomList = json(rooms)?.data ?? [];
  if (rooms.status !== 200 || roomList.length === 0) {
    exec.test.abort(`setup: no rooms for hotel ${hotelId} (HTTP ${rooms.status})`);
  }

  console.log(`booking-funnel: hotel ${hotelId}, ${roomList.length} rooms, ${DURATION} run`);

  return { hotelId, roomIds: roomList.map((room) => room.roomId).filter(Boolean) };
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;

  // Spread bookings across a wide check-in window so holds do not collide on a
  // single room-day and turn inventory exhaustion into latency.
  const offset = 30 + (iteration % 90);
  const checkIn = isoDate(offset);
  const checkOut = isoDate(offset + 2);
  const roomId = data.roomIds[iteration % data.roomIds.length];

  // Re-resolve rooms per date: availability is per room-day, and holding a room
  // that is already taken would measure a 409, not a booking.
  const rooms = request(
    'GET',
    `${API}/hotels/${data.hotelId}/rooms?checkInDate=${checkIn}&checkOutDate=${checkOut}` +
      '&numberOfRooms=1&numberOfGuests=1',
    'funnel-rooms'
  );

  const available = json(rooms)?.data ?? [];
  if (rooms.status !== 200 || available.length === 0) {
    // An empty date is not a defect; skip it and try the next window.
    funnelBroken.add(1);
    sleep(15);
    return;
  }

  const room = available[iteration % available.length];

  const hold = request('POST', `${API}/hold`, 'create-hold', {
    hotelId: data.hotelId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
    rooms: [{ roomId: room.roomId || roomId, quantity: 1 }],
    currency: 'USD',
  });

  check(hold, { 'create-hold: 200/201': (r) => r.status === 200 || r.status === 201 });

  const holdBody = json(hold);
  const holdId = pick(holdBody, ['data.holdId', 'data.hold.holdId', 'data.hold.id', 'data.id']);

  if (!holdId) {
    funnelBroken.add(1);
    sleep(15);
    return;
  }

  const booking = request('POST', `${API}/bookings`, 'create-booking', {
    holdId,
    guestDetails: {
      fullName: 'Load Test Guest',
      email: 'loadtest@example.com',
      phoneNumber: '+10000000000',
      country: 'VN',
      bookingFor: 'self',
      travellingForWork: false,
    },
    specialRequests: 'k6 load test — safe to cancel',
  });

  check(booking, {
    'create-booking: 200/201': (r) => r.status === 200 || r.status === 201,
  });

  const bookingId = pick(json(booking), [
    'data.bookingId',
    'data.booking.bookingId',
    'data.booking.id',
    'data.id',
  ]);

  if (bookingId) {
    request('GET', `${API}/bookings/${bookingId}`, 'get-booking');
  }

  sleep(15);
}
