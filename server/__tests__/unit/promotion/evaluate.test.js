const {
  evaluatePromotion,
  selectBestPromotion,
  normalizeCode,
} = require('@modules/promotion/domain/promotion');

const NOW = new Date('2026-06-01T00:00:00Z');

function promotion(overrides = {}) {
  return {
    id: 'promo-1',
    mode: 'automatic',
    status: 'active',
    name: 'Summer sale',
    currency: 'USD',
    discount_type: 'percentage',
    discount_basis_points: 2000,
    max_discount_amount: null,
    room_scope: 'all',
    version: 1,
    reserved_count: 0,
    redeemed_count: 0,
    promotionRooms: [],
    ...overrides,
  };
}

function basket() {
  return [
    {
      roomId: 'room-1',
      quantity: 1,
      subtotal: 300,
      subtotalMinor: 30000,
      nightly: [
        { date: '2026-06-10', total: 100, totalMinor: 10000 },
        { date: '2026-06-11', total: 100, totalMinor: 10000 },
        { date: '2026-06-12', total: 100, totalMinor: 10000 },
      ],
    },
    {
      roomId: 'room-2',
      quantity: 1,
      subtotal: 200,
      subtotalMinor: 20000,
      nightly: [
        { date: '2026-06-10', total: 100, totalMinor: 10000 },
        { date: '2026-06-11', total: 100, totalMinor: 10000 },
      ],
    },
  ];
}

function context(overrides = {}) {
  return {
    now: NOW,
    checkIn: '2026-06-10',
    checkOut: '2026-06-13',
    currency: 'USD',
    hotelTimezone: 'UTC',
    hotelLocalDate: '2026-06-01',
    rooms: basket(),
    userUsage: { reservedCount: 0, redeemedCount: 0 },
    ...overrides,
  };
}

describe('promotion eligibility', () => {
  it('normalizes promo codes consistently', () => {
    expect(normalizeCode('  summer-20  ')).toBe('SUMMER-20');
    expect(normalizeCode('')).toBeNull();
  });

  it('applies a percentage discount to all eligible room nights', () => {
    const result = evaluatePromotion(promotion(), context());
    expect(result.eligible).toBe(true);
    expect(result.eligibleSubtotalMinor).toBe(50000);
    expect(result.discountAmountMinor).toBe(10000);
    expect(result.allocationByRoom).toEqual([
      { roomId: 'room-1', amountMinor: 6000 },
      { roomId: 'room-2', amountMinor: 4000 },
    ]);
  });

  it('applies a fixed amount once per booking, not per room', () => {
    const result = evaluatePromotion(
      promotion({ discount_type: 'fixed', discount_value: '50.00', discount_basis_points: null }),
      context()
    );
    expect(result.eligible).toBe(true);
    expect(result.discountAmountMinor).toBe(5000);
  });

  it('caps a percentage discount', () => {
    const result = evaluatePromotion(promotion({ max_discount_amount: '25.00' }), context());
    expect(result.discountAmountMinor).toBe(2500);
  });

  it('only discounts targeted rooms for selected-room automatic offers', () => {
    const result = evaluatePromotion(
      promotion({ room_scope: 'selected', promotionRooms: [{ room_id: 'room-1' }] }),
      context()
    );
    expect(result.eligible).toBe(true);
    expect(result.eligibleSubtotalMinor).toBe(30000);
    expect(result.discountAmountMinor).toBe(6000);
    expect(result.allocationByRoom).toEqual([
      { roomId: 'room-1', amountMinor: 6000 },
      { roomId: 'room-2', amountMinor: 0 },
    ]);
  });

  it('requires every occupied night to be inside the stay window', () => {
    const result = evaluatePromotion(
      promotion({ stay_starts_on: '2026-06-11', stay_ends_on: '2026-06-20' }),
      context()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('outside_stay_window');
  });

  it('enforces minimum nights, spend and advance booking', () => {
    expect(evaluatePromotion(promotion({ min_nights: 4 }), context()).reason).toBe(
      'below_min_nights'
    );
    expect(evaluatePromotion(promotion({ min_subtotal: '600.00' }), context()).reason).toBe(
      'below_min_spend'
    );
    expect(evaluatePromotion(promotion({ min_advance_days: 30 }), context()).reason).toBe(
      'insufficient_advance'
    );
  });

  it('enforces code total and per-user limits', () => {
    const code = promotion({
      mode: 'code',
      code: 'SAVE20',
      normalized_code: 'SAVE20',
      total_use_limit: 1,
      redeemed_count: 1,
    });
    expect(evaluatePromotion(code, context()).reason).toBe('limit_reached');

    const perUser = promotion({
      mode: 'code',
      code: 'SAVE20',
      normalized_code: 'SAVE20',
      per_user_limit: 1,
    });
    expect(
      evaluatePromotion(perUser, context({ userUsage: { reservedCount: 1, redeemedCount: 0 } }))
        .reason
    ).toBe('user_limit_reached');
  });

  it('ignores inactive, expired and wrong-currency promotions', () => {
    expect(evaluatePromotion(promotion({ status: 'paused' }), context()).reason).toBe('not_active');
    expect(
      evaluatePromotion(promotion({ booking_ends_at: '2026-05-01T00:00:00Z' }), context()).reason
    ).toBe('ended');
    expect(evaluatePromotion(promotion({ currency: 'EUR' }), context()).reason).toBe(
      'currency_mismatch'
    );
  });
});

describe('promotion selection', () => {
  it('chooses the lowest final total and never stacks', () => {
    const automatic = promotion({ id: 'auto-1', discount_basis_points: 1000 });
    const code = promotion({
      id: 'code-1',
      mode: 'code',
      code: 'SAVE20',
      normalized_code: 'SAVE20',
      discount_basis_points: 2000,
    });

    const selection = selectBestPromotion({
      automaticPromotions: [automatic],
      codePromotion: code,
      context: context(),
      originalSubtotalMinor: 50000,
      taxRate: 0.1,
      serviceFeeRate: 0.05,
    });

    expect(selection.selected.promotionId).toBe('code-1');
    expect(selection.codeOutcome.status).toBe('applied');
  });

  it('prefers the automatic offer on an equal total', () => {
    const automatic = promotion({ id: 'auto-1', discount_basis_points: 2000 });
    const code = promotion({
      id: 'code-1',
      mode: 'code',
      code: 'SAVE20',
      normalized_code: 'SAVE20',
      discount_basis_points: 2000,
    });

    const selection = selectBestPromotion({
      automaticPromotions: [automatic],
      codePromotion: code,
      context: context(),
      originalSubtotalMinor: 50000,
    });

    expect(selection.selected.promotionId).toBe('auto-1');
    expect(selection.codeOutcome.status).toBe('automatic_better');
  });

  it('returns the automatic offer when the code does not apply', () => {
    const automatic = promotion({ id: 'auto-1' });
    const code = promotion({
      id: 'code-1',
      mode: 'code',
      code: 'SAVE20',
      normalized_code: 'SAVE20',
      booking_ends_at: '2026-05-01T00:00:00Z',
    });

    const selection = selectBestPromotion({
      automaticPromotions: [automatic],
      codePromotion: code,
      context: context(),
      originalSubtotalMinor: 50000,
    });

    expect(selection.selected.promotionId).toBe('auto-1');
    expect(selection.codeOutcome.status).toBe('rejected');
  });
});
