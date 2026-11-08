import { describe, expect, it } from 'vitest';
import {
  buildAppleDirectionsUrl,
  buildGoogleDirectionsUrl,
  buildOsmDirectionsUrl,
  directionsModeForDistance,
  getDirectionsUrl,
} from '@/utils/directions';

const hotel = { latitude: 21.028511, longitude: 105.804817 };

describe('directions links', () => {
  it('builds a Google Maps link with destination and walking mode', () => {
    const url = new URL(buildGoogleDirectionsUrl({ ...hotel, mode: 'walking' }));

    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('21.028511,105.804817');
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(url.searchParams.has('origin')).toBe(false);
  });

  it('adds a rounded GPS origin and the requested mode', () => {
    const url = new URL(
      buildGoogleDirectionsUrl({
        ...hotel,
        origin: { latitude: 21.028511, longitude: 105.804817 },
        mode: 'driving',
      })
    );

    expect(url.searchParams.get('origin')).toBe('21.029,105.805');
    expect(url.searchParams.get('travelmode')).toBe('driving');
  });

  it('builds Apple and OpenStreetMap links', () => {
    const apple = new URL(
      buildAppleDirectionsUrl({
        ...hotel,
        origin: { latitude: 21.0285, longitude: 105.8048 },
        mode: 'transit',
      })
    );
    const osm = new URL(
      buildOsmDirectionsUrl({
        ...hotel,
        origin: { latitude: 21.0285, longitude: 105.8048 },
      })
    );

    expect(apple.origin).toBe('https://maps.apple.com');
    expect(apple.searchParams.get('daddr')).toBe('21.028511,105.804817');
    expect(apple.searchParams.get('dirflg')).toBe('r');
    expect(apple.searchParams.get('saddr')).toBe('21.029,105.805');
    expect(osm.origin).toBe('https://www.openstreetmap.org');
    expect(osm.searchParams.get('to')).toBe('21.028511,105.804817');
    expect(osm.searchParams.get('from')).toBe('21.029,105.805');
  });

  it('invalidates links without valid hotel coordinates', () => {
    expect(buildGoogleDirectionsUrl({ latitude: null, longitude: 105.8 })).toBeNull();
    expect(buildAppleDirectionsUrl({ latitude: 91, longitude: 105.8 })).toBeNull();
    expect(buildOsmDirectionsUrl({ latitude: 21, longitude: 181 })).toBeNull();
  });

  it('selects Apple Maps on Apple platforms and Google elsewhere', () => {
    expect(
      getDirectionsUrl({ ...hotel, platform: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' })
    ).toContain('maps.apple.com');
    expect(
      getDirectionsUrl({ ...hotel, platform: 'Mozilla/5.0 (X11; Linux x86_64)' })
    ).toContain('google.com/maps');
  });

  it('defaults to walking for short distances and driving for longer ones', () => {
    expect(directionsModeForDistance(1.2)).toBe('walking');
    expect(directionsModeForDistance(2)).toBe('walking');
    expect(directionsModeForDistance(2.1)).toBe('driving');
    expect(directionsModeForDistance(null)).toBe('walking');
  });
});
