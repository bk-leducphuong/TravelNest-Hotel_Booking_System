const { getMetrics, recordBookingCheckout } = require('@platform/metrics');

const COUNTER = 'booking_checkout_duration_seconds_count';

async function checkoutCount(flow) {
  const body = await getMetrics().registry.metrics();
  const match = new RegExp(`${COUNTER}\\{flow="${flow}"\\} (\\d+)`).exec(body);
  return match ? Number(match[1]) : 0;
}

describe('booking checkout metric', () => {
  it('records the hold-to-booking interval', async () => {
    const before = await checkoutCount('pay_at_property');

    recordBookingCheckout({
      flow: 'pay_at_property',
      holdCreatedAt: new Date(Date.now() - 3000),
      bookingCreatedAt: new Date(),
    });

    expect(await checkoutCount('pay_at_property')).toBe(before + 1);
  });

  it('falls back to now when the booking row still carries a Sequelize literal', async () => {
    // A freshly inserted row has `created_at = CURRENT_TIMESTAMP` as a Sequelize
    // literal until it is reloaded; `new Date(literal)` is invalid.
    const before = await checkoutCount('prepay');

    recordBookingCheckout({
      flow: 'prepay',
      holdCreatedAt: new Date(Date.now() - 2000),
      bookingCreatedAt: { val: 'CURRENT_TIMESTAMP' },
    });

    expect(await checkoutCount('prepay')).toBe(before + 1);
  });

  it('does not record when the hold timestamp is missing', async () => {
    const before = await checkoutCount('no_hold');

    recordBookingCheckout({
      flow: 'no_hold',
      holdCreatedAt: null,
      bookingCreatedAt: new Date(),
    });

    expect(await checkoutCount('no_hold')).toBe(before);
  });
});
