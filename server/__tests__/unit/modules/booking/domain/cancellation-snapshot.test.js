const { evaluateSnapshot } = require('@modules/booking/domain/cancellation-policy');
const room = (overrides = {}) => ({
  roomId: 'r1',
  ruleId: 'rule1',
  amountMinor: 20000,
  isRefundable: true,
  refundPercentBeforeDeadline: 100,
  refundPercentAfterDeadline: 50,
  freeCancellationDeadline: '2026-11-10T07:00:00.000Z',
  ...overrides,
});
const booking = (rooms) => ({
  total_price: rooms.reduce((n, r) => n + r.amountMinor, 0) / 100,
  currency: 'USD',
  cancellation_policy_snapshot: { version: 2, rooms },
});
it('uses each room policy, including tax and fee allocations frozen in its amount', () => {
  const b = booking([room(), room({ roomId: 'r2', amountMinor: 30000, isRefundable: false })]);
  expect(evaluateSnapshot(b, new Date('2026-11-09'))).toMatchObject({
    refundAmount: 200,
    cancellationFee: 300,
  });
});
it('evaluates the exact frozen deadline without depending on live hotel timezone', () => {
  const b = booking([room()]);
  b.hotel = { timezone: 'Pacific/Auckland', check_in_time: '23:00:00' };
  expect(evaluateSnapshot(b, new Date('2026-11-10T07:00:00.000Z')).refundAmount).toBe(200);
  expect(evaluateSnapshot(b, new Date('2026-11-10T07:00:00.001Z')).refundAmount).toBe(100);
});
it('does not invent historical terms for old snapshots', () => {
  expect(
    evaluateSnapshot({ total_price: 100, cancellation_policy_snapshot: { rooms: [room()] } })
      .eligibility
  ).toBe('manual_review');
});
it('requires review for incomplete or corrupt snapshots', () => {
  const b = booking([room({ ruleId: null })]);
  expect(evaluateSnapshot(b).eligibility).toBe('manual_review');
  b.cancellation_policy_snapshot.rooms[0] = room();
  b.total_price = 201;
  expect(evaluateSnapshot(b).eligibility).toBe('manual_review');
});
it('rounds each room refund in cents deterministically', () => {
  expect(
    evaluateSnapshot(
      booking([room({ amountMinor: 101, refundPercentBeforeDeadline: 50 })]),
      new Date('2026-11-09')
    ).refundAmount
  ).toBe(0.51);
});
