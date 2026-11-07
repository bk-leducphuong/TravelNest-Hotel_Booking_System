const { buildOffersQuery } = require('@modules/search/infrastructure/queries/room-offers.query');

const BASE = {
  hotelIds: ['h1', 'h2'],
  checkIn: '2026-11-05',
  checkOut: '2026-11-08',
  nights: 3,
  rooms: 2,
  totalGuests: 4,
};

describe('room-offers query builder', () => {
  it('returns null without hotel ids', () => {
    expect(buildOffersQuery({ ...BASE, hotelIds: [] })).toBeNull();
    expect(buildOffersQuery({ ...BASE, hotelIds: undefined })).toBeNull();
  });

  it('queries every candidate hotel in one statement', () => {
    const { sql, replacements } = buildOffersQuery(BASE);

    expect(replacements).toEqual(
      expect.objectContaining({ hotel0: 'h1', hotel1: 'h2', nights: 3, rooms: 2, totalGuests: 4 })
    );
    expect(sql).toContain('r.hotel_id IN (:hotel0, :hotel1)');
  });

  it('uses minimum nightly availability, including holds', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0))');
    expect(sql).not.toMatch(/SUM\(ri\.total_rooms/);
    expect(sql).toContain('min_available_rooms >= :rooms');
  });

  it('requires every requested night to be open and covered', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain("ri.status = 'open'");
    expect(sql).toContain('ri.date >= :checkIn');
    expect(sql).toContain('ri.date < :checkOut');
    expect(sql).toContain('COUNT(DISTINCT ri.date)');
    expect(sql).toContain('covered_nights = :nights');
  });

  it('requires enough identical rooms for the whole party', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('r.max_guests * :rooms >= :totalGuests');
    expect(sql).not.toContain('r.max_guests >= :totalGuests');
  });

  it('groups by the room type row so nights are never stitched across types', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('GROUP BY r.hotel_id, r.id');
  });

  it('rejects mixed currencies within an offer', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('COUNT(DISTINCT ri.currency) AS currency_count');
    expect(sql).toContain('currency_count = 1');
  });

  it('leaves budget filtering to the promotion-aware domain layer', () => {
    const { sql } = buildOffersQuery({ ...BASE, minPrice: 50, maxPrice: 150 });

    // An undiscounted room above the budget must be allowed to qualify after
    // its automatic sale, so SQL cannot reject it.
    expect(sql).not.toContain('avg_price_per_night >= :minPrice');
    expect(sql).not.toContain('avg_price_per_night <= :maxPrice');
  });

  it('exposes offer-level free cancellation via EXISTS (no row multiplication)', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('EXISTS (');
    expect(sql).toContain('hotel_cancellation_rules');
    expect(sql).not.toContain('LEFT JOIN hotel_cancellation_rules');
  });

  it('orders deterministically for a stable winning offer', () => {
    const { sql } = buildOffersQuery(BASE);

    expect(sql).toContain('ORDER BY r.hotel_id ASC, total_price ASC, r.id ASC');
  });
});
