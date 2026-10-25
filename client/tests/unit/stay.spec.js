import { describe, expect, it } from 'vitest';
import { stayNights, formatStayDate } from '@/utils/stay';
import { normalizeBooking, guestMoney, ratingLabelKey } from '@/utils/guestPresentation';

describe('guest stay presentation', () => {
  it('counts checkout-exclusive calendar nights across month, leap-year and DST boundaries', () => {
    expect(stayNights('2026-11-10', '2026-11-13')).toBe(3);
    expect(stayNights('2024-02-28', '2024-03-01')).toBe(2);
    expect(stayNights('2026-03-07', '2026-03-10')).toBe(3);
    for (const pair of [
      [null, null],
      ['2026-11-10', '2026-11-10'],
      ['2026-11-13', '2026-11-10'],
      ['2026-02-30', '2026-03-03'],
    ])
      expect(stayNights(...pair)).toBe(0);
    expect(formatStayDate(null)).toBe('—');
  });
  it('retains authoritative zero amounts, explicit currency and multi-room records', () => {
    const record = normalizeBooking({
      booking_code: 'TN123',
      total_price: 0,
      currency: 'VND',
      hotel: { name: 'Real hotel' },
      bookingRooms: [{ room_id: 7, quantity: 2, room: { room_name: 'Suite' } }],
    });
    expect(record).toMatchObject({
      totalPrice: 0,
      currency: 'VND',
      rooms: [{ roomId: 7, roomName: 'Suite', quantity: 2 }],
    });
    expect(normalizeBooking(null)).toBe(null);
    expect(guestMoney(null)).toBe('—');
    expect(guestMoney('invalid')).toBe('—');
    expect(ratingLabelKey(9.2)).toBe('hotelDetails.rating.excellent');
    expect(ratingLabelKey(6.2)).toBe('hotelDetails.rating.pleasant');
  });
});
