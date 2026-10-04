const {
  assertKnownTask,
  buildDatabaseSeedArgs,
  buildImageSeedArgs,
  buildImageSeedEnv,
  buildCityImageSeedArgs,
  buildElasticsearchSetupArgs,
  buildElasticsearchSeedArgs,
  buildMongodbSeedArgs,
} = require('@platform/internal/args');

describe('platform/internal/args', () => {
  describe('assertKnownTask', () => {
    it('returns the script for a known task', () => {
      expect(assertKnownTask({ user: 'seeders/user.js' }, 'user', 'seeder')).toBe(
        'seeders/user.js'
      );
    });

    it('throws a 404 listing allowed values for an unknown task', () => {
      expect(() => assertKnownTask({ user: 'x' }, 'nope', 'seeder')).toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'UNKNOWN_INTERNAL_TASK',
        })
      );
    });
  });

  it('builds the "all" database seed args', () => {
    expect(buildDatabaseSeedArgs('all', { clear: true, quick: true, skipImages: true })).toEqual([
      '--clear',
      '--quick',
      '--skip-images',
    ]);
  });

  it('builds hotel_search_snapshot args', () => {
    expect(buildDatabaseSeedArgs('hotel_search_snapshot', { rebuild: true })).toEqual([
      '--rebuild',
    ]);
  });

  it('rejects conflicting image flags', () => {
    expect(() => buildImageSeedArgs({ hotelsOnly: true, roomsOnly: true })).toThrow(
      expect.objectContaining({ statusCode: 400, code: 'INVALID_INTERNAL_TASK_OPTION' })
    );
  });

  it('builds image args with a positive limit', () => {
    expect(buildImageSeedArgs({ skipPrerequisites: true, limit: 5 })).toEqual([
      '--skip-checks',
      '--limit=5',
    ]);
  });

  it('rejects a non-positive limit', () => {
    expect(() => buildImageSeedArgs({ limit: 0 })).toThrow(
      expect.objectContaining({ code: 'INVALID_INTERNAL_TASK_OPTION' })
    );
  });

  it('builds image env from urls and rejects non-strings', () => {
    expect(buildImageSeedEnv({ apiBaseUrl: 'http://x' })).toEqual({ API_BASE_URL: 'http://x' });
    expect(() => buildImageSeedEnv({ apiBaseUrl: 5 })).toThrow(
      expect.objectContaining({ code: 'INVALID_INTERNAL_TASK_OPTION' })
    );
  });

  it('builds city image args', () => {
    expect(buildCityImageSeedArgs({ primaryOnly: false })).toEqual(['--all-images']);
  });

  it('builds Elasticsearch setup args (log index only for logs)', () => {
    expect(buildElasticsearchSetupArgs('logs', { force: true, createIndex: true })).toEqual([
      '--force',
      '--create-index',
    ]);
    expect(buildElasticsearchSetupArgs('hotels', { force: true, createIndex: true })).toEqual([
      '--force',
    ]);
  });

  it('builds Elasticsearch seeder args for hotels', () => {
    expect(
      buildElasticsearchSeedArgs('hotels', { hotelIds: ['a', 'b'], status: 'active' })
    ).toEqual(['--hotel-ids=a,b', '--status=active']);
  });

  it('builds MongoDB seeder args per target', () => {
    expect(buildMongodbSeedArgs('search_logs', { days: 7, batch: 100, rows: 50 })).toEqual([
      '--days=7',
      '--batch=100',
      '--rows=50',
    ]);
    expect(buildMongodbSeedArgs('hotel_views', { avgPerHotel: 5 })).toEqual(['--avg-per-hotel=5']);
  });
});
