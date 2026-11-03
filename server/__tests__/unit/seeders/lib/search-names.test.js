const { backfillSearchNames } = require('../../../../seeders/lib/search-names');

describe('seeders/lib/search-names', () => {
  it('normalizes every row in batches and maps đ/Đ to d', async () => {
    const conn = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          [
            { hotel_id: 'h1', hotel_name: 'Đà Nẵng Grand' },
            { hotel_id: 'h2', hotel_name: 'Ha Noi Inn' },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 2 }])
        .mockResolvedValueOnce([[]]),
    };

    const result = await backfillSearchNames(conn, { log: jest.fn() });

    expect(result.updated).toBe(2);
    expect(conn.query).toHaveBeenCalledTimes(3);

    const [, params] = conn.query.mock.calls[1];
    expect(params).toEqual(
      expect.arrayContaining(['h1', 'da nang grand', 'h2', 'ha noi inn', 'dananggrand'])
    );
  });

  it('stops without querying when the table is empty', async () => {
    const conn = { query: jest.fn().mockResolvedValue([[]]) };

    await expect(backfillSearchNames(conn, { log: jest.fn() })).resolves.toMatchObject({
      updated: 0,
    });
    expect(conn.query).toHaveBeenCalledTimes(1);
  });
});
