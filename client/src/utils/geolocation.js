// Browser geolocation helpers. The view decides when to ask permission; this
// module only wraps the callback API and normalizes the failure codes it
// exposes so the UI can translate them.
const ERROR_CODES = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
};

// ~110 m at the equator: enough to filter by kilometres without putting a
// precise home address in the URL/history.
export const GEO_PRECISION = 3;

export function roundCoordinate(value, precision = GEO_PRECISION) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  const factor = 10 ** precision;
  return Math.round(numberValue * factor) / factor;
}

export function geolocationStatus() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  if (typeof window !== 'undefined' && window.isSecureContext === false) return 'insecure';
  return 'available';
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    const status = geolocationStatus();
    if (status !== 'available') {
      reject(Object.assign(new Error(status), { code: status }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = roundCoordinate(position.coords.latitude);
        const longitude = roundCoordinate(position.coords.longitude);
        if (latitude === null || longitude === null) {
          reject(Object.assign(new Error('unavailable'), { code: 'unavailable' }));
          return;
        }
        resolve({ latitude, longitude, accuracy: position.coords.accuracy ?? null });
      },
      (error) => {
        const code = ERROR_CODES[error?.code] || 'unavailable';
        reject(Object.assign(new Error(code), { code }));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000, ...options }
    );
  });
}
