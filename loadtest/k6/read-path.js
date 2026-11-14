/**
 * TravelNest — read-path load test.
 *
 * Drives the anonymous guest read path (the traffic that dominates the API
 * histogram and the `travelnest-api-slo` alert group):
 *
 *   search → hotel detail → room list → room availability → trending
 *
 * Every request is anonymous on purpose: those routes use
 * `optionalAuthenticate`, so no Keycloak token is needed and the test does not
 * depend on a load-test user existing.
 *
 * Usage (see loadtest/README.md):
 *
 *   make load-test-read
 *   BASE_URL=http://localhost:3000 PEAK_VUS=25 make load-test-read
 *
 * Two things the script refuses to hide:
 *
 *   1. HTTP 429. The API throttles ~300 requests / 15 min per IP
 *      (`RATE_LIMIT_MAX`), which a real load test exceeds in seconds. Two
 *      consecutive 429s abort the run instead of reporting the throttle as
 *      latency. The target must run with `RATE_LIMIT_ENABLED=false`.
 *   2. A broken data set. `setup()` resolves real hotel ids from the search
 *      endpoint and aborts if it cannot, rather than measuring 404s.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || 'https://api.trestay.com').replace(/\/+$/, '');
const API = `${BASE_URL}/api/v1`;
const CITY = __ENV.CITY || 'Hanoi';
const PEAK_VUS = Number(__ENV.PEAK_VUS || 12);
const HOLD_DURATION = __ENV.HOLD_DURATION || '8m';
/** SMOKE=true swaps the ramp for a 20 s two-VU run: checks the script, not the server. */
const SMOKE = __ENV.SMOKE === 'true';

const rateLimited = new Counter('rate_limited');

/** Consecutive 429s seen by this VU; 2 aborts the run. */
let consecutive429 = 0;

function isoDate(daysFromNow) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const CHECK_IN = __ENV.CHECK_IN || isoDate(7);
const CHECK_OUT = __ENV.CHECK_OUT || isoDate(9);

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: SMOKE
    ? {
        smoke: {
          executor: 'constant-vus',
          vus: 2,
          duration: '20s',
        },
      }
    : {
        read_path: {
          executor: 'ramping-vus',
          startVUs: 1,
          stages: [
            { duration: '1m', target: 4 },
            { duration: '1m', target: PEAK_VUS },
            { duration: HOLD_DURATION, target: PEAK_VUS },
            { duration: '30s', target: 0 },
          ],
          gracefulRampDown: '30s',
          gracefulStop: '30s',
        },
      },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    rate_limited: ['count<1'],
    'http_req_duration{name:search-hotels}': ['p(95)<2000'],
    'http_req_duration{name:hotel-detail}': ['p(95)<1500'],
    'http_req_duration{name:hotel-rooms}': ['p(95)<1500'],
    'http_req_duration{name:room-availability}': ['p(95)<1000'],
    'http_req_duration{name:trending-destinations}': ['p(95)<1000'],
  },
};

/**
 * Resolve real hotel ids and fixed dates once, before any VU starts.
 *
 * The dates are pinned for the whole run so every VU queries the same
 * inventory window — otherwise each VU would spread across check-in dates and
 * the per-request cache hit rate would look better than it really is.
 */
export function setup() {
  const url =
    `${API}/search/hotels?city=${encodeURIComponent(CITY)}` +
    `&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2&rooms=1`;

  const response = http.get(url, { tags: { name: 'setup-search' } });

  if (response.status !== 200) {
    exec.test.abort(
      `setup: search returned HTTP ${response.status} from ${BASE_URL}. ` +
        'Check BASE_URL and that the environment is seeded with hotels.'
    );
  }

  let hotels = [];
  try {
    hotels = response.json('data.hotels') || [];
  } catch (error) {
    exec.test.abort(`setup: search response was not JSON: ${error}`);
  }

  const hotelIds = hotels.map((hotel) => hotel.hotel_id).filter(Boolean).slice(0, 20);

  if (hotelIds.length === 0) {
    exec.test.abort(
      `setup: search for "${CITY}" returned no hotels. Seed the environment or set CITY.`
    );
  }

  console.log(
    `read-path: ${hotelIds.length} hotels, ${CHECK_IN} -> ${CHECK_OUT}, ` +
      (SMOKE ? 'smoke run (2 VUs, 20s)' : `peak ${PEAK_VUS} VUs`)
  );

  return { hotelIds, checkIn: CHECK_IN, checkOut: CHECK_OUT };
}

/**
 * GET with uniform 429 handling and checks.
 *
 * `name` becomes the `name` tag, which is what the per-endpoint thresholds and
 * the summary table key off.
 */
function get(url, name) {
  const response = http.get(url, { tags: { name } });

  if (response.status === 429) {
    rateLimited.add(1);
    consecutive429 += 1;
    if (consecutive429 >= 2) {
      exec.test.abort(
        'HTTP 429 from the API rate limiter. Set RATE_LIMIT_ENABLED=false on the ' +
          'target for the duration of the run; a throttled run measures the ' +
          'limiter, not the API.'
      );
    }
    return response;
  }

  consecutive429 = 0;

  check(response, {
    [`${name}: 200`]: (r) => r.status === 200,
    [`${name}: success envelope`]: (r) => {
      if (r.status !== 200) return false;
      try {
        return r.json('success') === true;
      } catch (error) {
        return false;
      }
    },
  });

  return response;
}

export default function (data) {
  // Deterministic mix over a 20-step cycle: 30% search, 25% detail, 20% rooms,
  // 20% availability, 5% trending. The cycle is short so even a 20-second smoke
  // run touches every endpoint; a `% 100` cycle would bias short runs entirely
  // towards search.
  const bucket = exec.scenario.iterationInTest % 20;
  const hotelId = data.hotelIds[exec.scenario.iterationInTest % data.hotelIds.length];

  if (bucket < 6) {
    get(
      `${API}/search/hotels?city=${encodeURIComponent(CITY)}` +
        `&checkIn=${data.checkIn}&checkOut=${data.checkOut}&adults=2&rooms=1`,
      'search-hotels'
    );
  } else if (bucket < 11) {
    get(`${API}/hotels/${hotelId}`, 'hotel-detail');
  } else if (bucket < 15) {
    get(
      `${API}/hotels/${hotelId}/rooms` +
        `?checkInDate=${data.checkIn}&checkOutDate=${data.checkOut}` +
        '&numberOfRooms=1&numberOfGuests=2',
      'hotel-rooms'
    );
  } else if (bucket < 19) {
    get(
      `${API}/search/hotels/${hotelId}/availability` +
        `?checkIn=${data.checkIn}&checkOut=${data.checkOut}&adults=2`,
      'room-availability'
    );
  } else {
    get(`${API}/search/destinations/trending?limit=8`, 'trending-destinations');
  }

  // Think time keeps VUs from hammering in lockstep, which would inflate the
  // tail with thundering-herd artefacts rather than server cost.
  sleep(0.5 + Math.random() * 1.5);
}

/** Per-endpoint request mix, in percent. Kept in sync with the dispatch below. */
const MIX = {
  'search-hotels': 30,
  'hotel-detail': 25,
  'hotel-rooms': 20,
  'room-availability': 20,
  'trending-destinations': 5,
};

/** Compact summary: per-endpoint percentiles plus every threshold verdict. */
export function handleSummary(data) {
  const metrics = data.metrics;
  const ms = (value) => (value === undefined ? '-' : `${Math.round(value)}ms`);
  const lines = [];

  lines.push('');
  lines.push('TravelNest read-path load test');
  lines.push('─────────────────────────────');

  const requests = metrics.http_reqs?.values ?? { count: 0, rate: 0 };
  const failed = metrics.http_req_failed?.values?.rate ?? 0;
  lines.push(`requests     ${requests.count} (${requests.rate.toFixed(1)}/s)`);
  lines.push(`failed       ${(failed * 100).toFixed(2)}%`);

  const limited = metrics.rate_limited?.values?.count ?? 0;
  if (limited > 0) lines.push(`rate limited ${limited} x HTTP 429`);
  lines.push('');

  lines.push('endpoint                    share      p50      p95      p99      max');
  for (const [name, share] of Object.entries(MIX)) {
    const values = metrics[`http_req_duration{name:${name}}`]?.values;
    if (!values) {
      lines.push(`${name.padEnd(24)} ${String(share).padStart(4)}%  (no samples)`);
      continue;
    }
    lines.push(
      `${name.padEnd(24)} ${String(share).padStart(4)}%  ` +
        `${ms(values.med).padStart(8)} ${ms(values['p(95)']).padStart(8)} ` +
        `${ms(values['p(99)']).padStart(8)} ${ms(values.max).padStart(8)}`
    );
  }

  lines.push('');
  lines.push('thresholds');
  for (const [key, value] of Object.entries(metrics)) {
    for (const [expression, result] of Object.entries(value.thresholds || {})) {
      lines.push(`  ${result.ok ? 'PASS' : 'FAIL'}  ${key} ${expression}`);
    }
  }

  if (limited > 0) {
    lines.push('');
    lines.push('The run was throttled; treat the latency numbers as invalid.');
    lines.push('Set RATE_LIMIT_ENABLED=false on the target and run again.');
  }

  // The whole point of load testing is sample size; say so when there isn't any.
  if (requests.count < 500) {
    lines.push('');
    lines.push(
      `Only ${requests.count} requests — this is a smoke check, not a baseline. ` +
        'A meaningful p95 needs the full ramp (see SMOKE=false).'
    );
  }

  lines.push('');

  // Keep the raw run next to the numbers so thresholds can be re-derived
  // later without re-running the test.
  const resultDir = (__ENV.RESULT_DIR || 'loadtest/results').replace(/\/+$/, '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    stdout: `${lines.join('\n')}\n`,
    [`${resultDir}/read-path-${stamp}.json`]: JSON.stringify(data, null, 2),
  };
}
