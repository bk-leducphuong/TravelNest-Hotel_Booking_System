export function ratingLabelKey(value) {
  const score = Number(value);
  const label =
    score >= 9
      ? 'excellent'
      : score >= 8
        ? 'veryGood'
        : score >= 7
          ? 'good'
          : score >= 6
            ? 'pleasant'
            : score > 0
              ? 'acceptable'
              : 'noRating';
  return `hotelDetails.rating.${label}`;
}
export function guestMoney(value, currency = 'USD', locale = 'en') {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)))
    return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value));
  } catch {
    return '—';
  }
}
export function normalizeBooking(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rows = raw.bookingRooms || raw.rooms || (raw.room_id || raw.room ? [raw] : []);
  return {
    ...raw,
    booking_code: raw.booking_code || raw.bookingCode,
    checkInDate: raw.check_in_date || raw.checkInDate,
    checkOutDate: raw.check_out_date || raw.checkOutDate,
    totalPrice: raw.total_price ?? raw.totalPrice,
    // Existing public booking pricing is USD; retain an explicit currency if returned.
    currency: raw.currency || 'USD',
    numberOfGuests: raw.number_of_guests ?? raw.numberOfGuests,
    hotel: raw.hotel || {},
    rooms: rows.map((row) => ({
      roomId: row.room_id || row.roomId || row.room?.id,
      roomName: row.room?.room_name || row.room_name || row.roomName,
      quantity: row.quantity ?? row.roomQuantity ?? 1,
    })),
  };
}
