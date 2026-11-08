const {
  toMinor,
  fromMinor,
  percentOfMinor,
  allocateMinor,
} = require('@modules/promotion/domain/money');

describe('promotion money helpers', () => {
  it('converts DECIMAL-like values to exact minor units', () => {
    expect(toMinor('100.00')).toBe(10000);
    expect(toMinor(99.995)).toBe(10000);
    expect(toMinor(null)).toBe(0);
    expect(fromMinor(12345)).toBe(123.45);
  });

  it('rounds percentage discounts half-up', () => {
    expect(percentOfMinor(10000, 2000)).toBe(2000);
    expect(percentOfMinor(9999, 3333)).toBe(3333);
    expect(percentOfMinor(10000, 0)).toBe(0);
  });

  it('allocates every minor unit with a deterministic remainder', () => {
    expect(allocateMinor(1000, [1000, 2000])).toEqual([333, 667]);
    expect(allocateMinor(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocateMinor(1000, [0, 0])).toEqual([1000, 0]);
    expect(allocateMinor(0, [5, 5])).toEqual([0, 0]);
  });
});
