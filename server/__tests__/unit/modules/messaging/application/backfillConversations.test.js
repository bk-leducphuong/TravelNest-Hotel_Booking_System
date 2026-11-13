const {
  backfillConversations,
  normalizeDate,
  normalizeStatuses,
} = require('@modules/messaging/application/backfillConversations');

function fakeSequelize(query) {
  return {
    query,
    escape: (value) => `'${String(value).replace(/'/g, "''")}'`,
  };
}

const booking = (id) => ({
  id,
  hotel_id: 'hotel-1',
  buyer_id: 'guest-1',
});

describe('backfillConversations argument normalization', () => {
  it('drops expired and duplicate statuses', () => {
    expect(normalizeStatuses(['confirmed', 'expired', 'confirmed', 'checked_in'])).toEqual([
      'confirmed',
      'checked_in',
    ]);
  });

  it('rejects unknown booking statuses', () => {
    expect(() => normalizeStatuses(['confirmed', 'not-a-status'])).toThrow(
      'Unknown booking status'
    );
  });

  it('accepts only YYYY-MM-DD dates', () => {
    expect(normalizeDate('2026-11-01')).toBe('2026-11-01');
    expect(() => normalizeDate('01/11/2026')).toThrow('YYYY-MM-DD');
  });
});

describe('backfillConversations', () => {
  it('counts would-be rows in dry-run mode without inserting', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([[booking('b1'), booking('b2')]])
      .mockResolvedValueOnce([[]]);
    const sequelize = fakeSequelize(query);

    const result = await backfillConversations({ sequelize, dryRun: true, batchSize: 10 });

    expect(result).toMatchObject({ scanned: 2, created: 2, batches: 1, dryRun: true });
    expect(query.mock.calls.every(([sql]) => sql.includes('SELECT b.id'))).toBe(true);
  });

  it('inserts UUIDv4 ids and stops when the next batch is empty', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([[booking('b1')]])
      .mockResolvedValueOnce([{}, { affectedRows: 1 }])
      .mockResolvedValueOnce([[]]);
    const sequelize = fakeSequelize(query);

    const result = await backfillConversations({ sequelize, batchSize: 10 });

    expect(result).toMatchObject({ scanned: 1, created: 1, batches: 1 });

    const insertSql = query.mock.calls[1][0];
    expect(insertSql).toContain('INSERT IGNORE INTO conversations');
    expect(insertSql).toMatch(
      /'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'/i
    );
  });

  it('uses the active/future filter by default and honors all/since overrides', async () => {
    const makeQuery = () => jest.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);

    const defaultQuery = makeQuery();
    await backfillConversations({ sequelize: fakeSequelize(defaultQuery), dryRun: true });
    expect(defaultQuery.mock.calls[0][0]).toContain('b.check_out_date >= CURDATE()');

    const sinceQuery = makeQuery();
    await backfillConversations({
      sequelize: fakeSequelize(sinceQuery),
      dryRun: true,
      since: '2026-01-01',
    });
    expect(sinceQuery.mock.calls[0][0]).toContain('b.check_out_date >= :since');

    const allQuery = makeQuery();
    await backfillConversations({ sequelize: fakeSequelize(allQuery), dryRun: true, all: true });
    expect(allQuery.mock.calls[0][0]).not.toContain('b.check_out_date');
  });
});
