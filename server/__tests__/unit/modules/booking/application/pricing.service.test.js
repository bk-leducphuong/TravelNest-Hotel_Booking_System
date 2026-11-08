jest.mock('@modules/inventory', () => ({}));
jest.mock('@modules/promotion', () => ({}));
jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  findCancellationHotel: jest.fn(),
  findCancellationRule: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const pricingService = require('@modules/booking/application/pricing.service');

const pricing = {
  rooms: [
    { subtotal: 100, discountedSubtotal: 100 },
    { subtotal: 200, discountedSubtotal: 200 },
  ],
  subtotal: 300,
  totalPrice: 330,
  checkInDate: '2999-02-01',
};

function rule(overrides = {}) {
  return {
    toJSON: () => ({ ...overrides }),
  };
}

describe('booking/application/pricing.service booking terms snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bookingRepository.findCancellationHotel.mockResolvedValue({
      check_in_time: '14:00:00',
      timezone: 'UTC',
    });
  });

  it('resolves pay-at-property only when every room allows it', async () => {
    bookingRepository.findCancellationRule
      .mockResolvedValueOnce(rule({ id: 'rule-1', payment_policy: 'pay_at_property' }))
      .mockResolvedValueOnce(rule({ id: 'rule-2', payment_policy: 'pay_at_property' }));

    const terms = await pricingService.getBookingTermsSnapshot('h1', ['r1', 'r2'], pricing);

    expect(terms.paymentPolicy.mode).toBe('pay_at_property');
    expect(terms.paymentPolicy.rooms).toEqual([
      { roomId: 'r1', policy: 'pay_at_property', ruleId: 'rule-1' },
      { roomId: 'r2', policy: 'pay_at_property', ruleId: 'rule-2' },
    ]);
    expect(terms.cancellationPolicy.rooms).toHaveLength(2);
  });

  it('falls back to prepay for a mixed property and defaults missing rules', async () => {
    bookingRepository.findCancellationRule
      .mockResolvedValueOnce(rule({ id: 'rule-1', payment_policy: 'pay_at_property' }))
      .mockResolvedValueOnce(null);

    const terms = await pricingService.getBookingTermsSnapshot('h1', ['r1', 'r2'], pricing);

    expect(terms.paymentPolicy.mode).toBe('prepay');
    expect(terms.paymentPolicy.rooms[1]).toEqual({
      roomId: 'r2',
      policy: 'prepay',
      ruleId: null,
    });
  });
});
