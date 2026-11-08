const GOOGLE_MODES = {
  walking: 'walking',
  driving: 'driving',
  transit: 'transit',
};

const APPLE_MODES = {
  walking: 'w',
  driving: 'd',
  transit: 'r',
};

const DEFAULT_MODE = 'walking';
const WALKING_DISTANCE_KM = 2;
const ORIGIN_PRECISION = 3;
const DESTINATION_PRECISION = 6;

function coordinate(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function formatPoint(latitude, longitude, precision) {
  const lat = coordinate(latitude, -90, 90);
  const lng = coordinate(longitude, -180, 180);
  if (lat === null || lng === null) return null;

  const factor = 10 ** precision;
  return `${Math.round(lat * factor) / factor},${Math.round(lng * factor) / factor}`;
}

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'object') return null;
  return formatPoint(origin.latitude, origin.longitude, ORIGIN_PRECISION);
}

export function directionsModeForDistance(distanceKm) {
  const value = Number(distanceKm);
  return Number.isFinite(value) && value > WALKING_DISTANCE_KM ? 'driving' : 'walking';
}

export function buildGoogleDirectionsUrl({ latitude, longitude, origin, mode = DEFAULT_MODE }) {
  const destination = formatPoint(latitude, longitude, DESTINATION_PRECISION);
  if (!destination) return null;

  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: GOOGLE_MODES[mode] || DEFAULT_MODE,
  });
  const from = normalizeOrigin(origin);
  if (from) params.set('origin', from);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildAppleDirectionsUrl({ latitude, longitude, origin, mode = DEFAULT_MODE }) {
  const destination = formatPoint(latitude, longitude, DESTINATION_PRECISION);
  if (!destination) return null;

  const params = new URLSearchParams({
    daddr: destination,
    dirflg: APPLE_MODES[mode] || APPLE_MODES[DEFAULT_MODE],
  });
  const from = normalizeOrigin(origin);
  if (from) params.set('saddr', from);

  return `https://maps.apple.com/?${params.toString()}`;
}

export function buildOsmDirectionsUrl({ latitude, longitude, origin }) {
  const destination = formatPoint(latitude, longitude, DESTINATION_PRECISION);
  if (!destination) return null;

  const params = new URLSearchParams({ to: destination });
  const from = normalizeOrigin(origin);
  if (from) params.set('from', from);

  return `https://www.openstreetmap.org/directions?${params.toString()}`;
}

/**
 * Pick the native map for the platform. The deep link lets the device use its
 * own precise current location when we do not supply an origin.
 */
export function getDirectionsUrl({
  latitude,
  longitude,
  origin = null,
  mode = DEFAULT_MODE,
  platform = '',
}) {
  const userAgent =
    platform || (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const useAppleMaps = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent);

  return useAppleMaps
    ? buildAppleDirectionsUrl({ latitude, longitude, origin, mode })
    : buildGoogleDirectionsUrl({ latitude, longitude, origin, mode });
}
