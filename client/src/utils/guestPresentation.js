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

function promotionDiscountType(promotion) {
  return promotion?.discountType ?? promotion?.discount_type ?? null;
}

function promotionBasisPoints(promotion) {
  return promotion?.discountBasisPoints ?? promotion?.discount_basis_points ?? null;
}

/**
 * Guest-facing label for a promotion badge. Internal `[Seed]` names are never
 * rendered; percentage offers become "N% off" and everything else uses the
 * generic localized "Sale" label.
 */
export function promotionBadgeDescriptor(promotion) {
  const basisPoints = Number(promotionBasisPoints(promotion));
  if (
    promotionDiscountType(promotion) === 'percentage' &&
    Number.isFinite(basisPoints) &&
    basisPoints > 0
  ) {
    return { key: 'userHome.dealBadge', params: { percent: Math.round(basisPoints / 100) } };
  }

  return { key: 'guest.checkout.saleBadge', params: {} };
}

/**
 * Real campaign names are safe to show. Seed/admin placeholder names are not.
 * Returns null when the caller should fall back to a badge label.
 */
export function promotionDisplayName(promotion) {
  const name = String(promotion?.name || '').trim();
  return name && !name.startsWith('[Seed]') ? name : null;
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
    discountAmount: Number(raw.discount_amount ?? raw.discountAmount ?? 0) || 0,
    priceBreakdown: raw.price_breakdown ?? raw.priceBreakdown ?? null,
    promotion: raw.promotion ?? raw.price_breakdown?.promotion ?? null,
    // Existing public booking pricing is USD; retain an explicit currency if returned.
    currency: raw.currency || 'USD',
    numberOfGuests: raw.number_of_guests ?? raw.numberOfGuests,
    paymentPolicy: raw.payment_policy ?? raw.paymentPolicy ?? 'prepay',
    paymentDueAt: raw.payment_due_at ?? raw.paymentDueAt ?? null,
    hotel: raw.hotel || {},
    rooms: rows.map((row) => ({
      roomId: row.room_id || row.roomId || row.room?.id,
      roomName: row.room?.room_name || row.room_name || row.roomName,
      quantity: row.quantity ?? row.roomQuantity ?? 1,
    })),
  };
}
