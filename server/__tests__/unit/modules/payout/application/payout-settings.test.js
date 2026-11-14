const settings = require('@modules/payout/application/payout-settings');

const MANAGED_KEYS = [
  'PAYOUT_AUTO_GENERATE',
  'PAYOUT_AUTO_PROCESS',
  'PAYOUT_GENERATION_INTERVAL_MS',
  'PAYOUT_PROCESSING_INTERVAL_MS',
  'PAYOUT_HOLD_DAYS',
  'PAYOUT_MIN_AMOUNT',
  'PAYOUT_STALE_MINUTES',
  'PAYOUT_BATCH_SIZE',
  'PAYOUT_RECOVERY_BATCH_SIZE',
];

describe('payout/application/payout-settings', () => {
  const original = {};

  beforeEach(() => {
    for (const key of MANAGED_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it('defaults to automation off and a 7-day hold', () => {
    expect(settings.isAutoGenerateEnabled()).toBe(false);
    expect(settings.isAutoProcessEnabled()).toBe(false);
    expect(settings.getHoldDays()).toBe(7);
    expect(settings.getMinimumPayoutAmount()).toBe(0);
  });

  it('parses the automation flags', () => {
    process.env.PAYOUT_AUTO_GENERATE = 'true';
    process.env.PAYOUT_AUTO_PROCESS = '1';

    expect(settings.isAutoGenerateEnabled()).toBe(true);
    expect(settings.isAutoProcessEnabled()).toBe(true);
  });

  it('computes the eligibility cutoff from the hold days', () => {
    process.env.PAYOUT_HOLD_DAYS = '3';
    const now = new Date('2026-05-10T12:00:00.000Z');

    expect(settings.getEligibilityCutoffDate(now).toISOString()).toBe('2026-05-07T12:00:00.000Z');
  });

  it('computes the stale-processing threshold from the stale minutes', () => {
    process.env.PAYOUT_STALE_MINUTES = '30';
    const now = new Date('2026-05-10T12:00:00.000Z');

    expect(settings.getStaleThresholdDate(now).toISOString()).toBe('2026-05-10T11:30:00.000Z');
  });

  it('ignores invalid numbers and enforces sane intervals', () => {
    process.env.PAYOUT_HOLD_DAYS = 'not-a-number';
    process.env.PAYOUT_GENERATION_INTERVAL_MS = '10';

    expect(settings.getHoldDays()).toBe(7);
    expect(settings.getGenerationIntervalMs()).toBe(60000);
  });
});
