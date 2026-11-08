import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentPosition, roundCoordinate } from '@/utils/geolocation';

const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

function setGeolocation(value) {
  Object.defineProperty(navigator, 'geolocation', {
    value,
    configurable: true,
  });
}

describe('geolocation helpers', () => {
  beforeEach(() => {
    setGeolocation({
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 25 },
        })
      ),
    });
  });

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    } else {
      setGeolocation(undefined);
    }
  });

  it('rounds coordinates to the privacy precision before they reach the URL', () => {
    expect(roundCoordinate(21.028511)).toBe(21.029);
    expect(roundCoordinate(105.804817)).toBe(105.805);
    expect(roundCoordinate('not-a-number')).toBeNull();
  });

  it('resolves rounded coordinates from the browser', async () => {
    await expect(getCurrentPosition()).resolves.toEqual({
      latitude: 21.029,
      longitude: 105.805,
      accuracy: 25,
    });
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ])('maps browser error %s to "%s"', async (browserCode, expectedCode) => {
    setGeolocation({
      getCurrentPosition: vi.fn((_success, failure) => failure({ code: browserCode })),
    });

    await expect(getCurrentPosition()).rejects.toMatchObject({ code: expectedCode });
  });

  it('reports unsupported when the browser has no geolocation API', async () => {
    setGeolocation(undefined);

    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 'unsupported' });
  });
});
