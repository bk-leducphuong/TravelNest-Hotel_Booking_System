const inventoryModule = require('@modules/inventory');
const promotionModule = require('@modules/promotion');
const ApiError = require('@utils/ApiError');
const bookingRepository = require('../infrastructure/booking.repository');
const { getHotelCheckInDateTime } = require('../domain/check-in-time');
const { normalizePaymentPolicy, resolvePaymentPolicy } = require('../domain/payment-policy');

const PRICING_VERSION = 1;

class PricingService {
  async quote({
    hotelId,
    rooms,
    checkInDate,
    checkOutDate,
    promotionCode = null,
    buyerId = null,
    now = new Date(),
    applyPromotions = true,
  }) {
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      throw new ApiError(400, 'INVALID_ROOMS', 'rooms must be a non-empty array');
    }

    const roomIds = rooms.map((room) => room.roomId || room.room_id);
    const quantityByRoom = new Map(
      rooms.map((room) => [room.roomId || room.room_id, room.quantity || room.roomQuantity || 1])
    );

    const inventories = await inventoryModule.getInventoryForDateRange(
      roomIds,
      checkInDate,
      checkOutDate
    );

    const expectedDates = this.getNights(checkInDate, checkOutDate);
    const byRoomDate = new Map();
    for (const inventory of inventories) {
      const date = this.toDateString(inventory.date);
      byRoomDate.set(`${inventory.room_id}:${date}`, inventory);
    }

    const roomBreakdown = [];
    let subtotal = 0;

    for (const roomId of roomIds) {
      const quantity = quantityByRoom.get(roomId) || 1;
      const nightly = [];
      let roomSubtotal = 0;

      for (const date of expectedDates) {
        const inventory = byRoomDate.get(`${roomId}:${date}`);
        const price = this.roundMoney(inventory?.price_per_night || 0);
        const nightTotal = this.roundMoney(price * quantity);
        roomSubtotal = this.roundMoney(roomSubtotal + nightTotal);
        nightly.push({ date, price, quantity, total: nightTotal });
      }

      subtotal = this.roundMoney(subtotal + roomSubtotal);
      roomBreakdown.push({
        roomId,
        quantity,
        nightly,
        subtotal: roomSubtotal,
        originalSubtotal: roomSubtotal,
        discountAmount: 0,
        discountedSubtotal: roomSubtotal,
        totalPrice: roomSubtotal,
      });
    }

    const taxRate = this.normalizeRate(process.env.BOOKING_TAX_RATE || 0);
    const serviceFeeRate = this.normalizeRate(process.env.BOOKING_SERVICE_FEE_RATE || 0);
    const platformCommissionRate = this.normalizeRate(process.env.PLATFORM_FEE_RATE || 0);

    // Manual bookings deliberately opt out: a manual total override must never
    // combine with an automatic promotion or consume a code.
    const promotionQuote = applyPromotions
      ? await promotionModule.resolveQuotePromotion({
          hotelId,
          rooms: roomBreakdown,
          checkInDate,
          checkOutDate,
          currency: 'USD',
          code: promotionCode,
          buyerId,
          now,
          taxRate,
          serviceFeeRate,
        })
      : { selected: null, automatic: null, codeOutcome: null };

    const selected = promotionQuote.selected;
    const discountAmount = selected ? promotionModule.fromMinor(selected.discountAmountMinor) : 0;
    const discountedSubtotal = this.roundMoney(Math.max(0, subtotal - discountAmount));
    const taxAmount = this.roundMoney(discountedSubtotal * taxRate);
    const serviceFeeAmount = this.roundMoney(discountedSubtotal * serviceFeeRate);
    const platformCommissionAmount = this.roundMoney(discountedSubtotal * platformCommissionRate);
    const totalPrice = this.roundMoney(discountedSubtotal + taxAmount + serviceFeeAmount);

    const allocationByRoom = new Map(
      (selected?.allocationByRoom || []).map((line) => [
        String(line.roomId),
        promotionModule.fromMinor(line.amountMinor) || 0,
      ])
    );

    for (const room of roomBreakdown) {
      const roomDiscount = allocationByRoom.get(String(room.roomId)) || 0;
      room.discountAmount = this.roundMoney(roomDiscount);
      room.discountedSubtotal = this.roundMoney(Math.max(0, room.subtotal - roomDiscount));
      room.totalPrice = room.discountedSubtotal;
    }

    const bookingTerms = await this.getBookingTermsSnapshot(hotelId, roomIds, {
      rooms: roomBreakdown,
      subtotal,
      totalPrice,
      checkInDate,
    });
    const cancellationPolicy = bookingTerms.cancellationPolicy;

    const quote = {
      version: PRICING_VERSION,
      subtotal,
      discountAmount,
      discountedSubtotal,
      taxAmount,
      serviceFeeAmount,
      platformCommissionAmount,
      totalPrice,
      currency: 'USD',
      taxRate,
      serviceFeeRate,
      platformCommissionRate,
      rooms: roomBreakdown,
      promotion: selected?.promotion || null,
      automaticPromotion: promotionQuote.automatic?.promotion || null,
      codeOutcome: promotionQuote.codeOutcome || null,
      discountAllocation: selected?.allocationByRoom || [],
      cancellationPolicy,
      paymentPolicy: bookingTerms.paymentPolicy,
    };

    quote.priceFingerprint = this.fingerprint(quote, {
      hotelId,
      checkInDate,
      checkOutDate,
      selected,
    });

    return quote;
  }

  /**
   * Stable identity for the quote the guest reviewed. Booking creation compares
   * this value; it is never trusted as a price source.
   */
  fingerprint(quote, context = {}) {
    return promotionModule.hashPricing({
      pricingVersion: quote.version,
      hotelId: context.hotelId,
      checkInDate: context.checkInDate,
      checkOutDate: context.checkOutDate,
      currency: quote.currency,
      taxRate: quote.taxRate,
      serviceFeeRate: quote.serviceFeeRate,
      platformCommissionRate: quote.platformCommissionRate,
      rooms: (quote.rooms || []).map((room) => ({
        roomId: room.roomId,
        quantity: room.quantity,
        subtotal: room.subtotal,
        discountAmount: room.discountAmount,
        discountedSubtotal: room.discountedSubtotal,
        nightly: (room.nightly || []).map((night) => ({
          date: night.date,
          price: night.price,
          quantity: night.quantity,
          total: night.total,
        })),
      })),
      promotion: context.selected
        ? {
            id: context.selected.promotion?.id,
            version: context.selected.promotion?.version,
            mode: context.selected.promotion?.mode,
            discountType: context.selected.promotion?.discountType,
            discountValue: context.selected.promotion?.discountValue,
            discountBasisPoints: context.selected.promotion?.discountBasisPoints,
            maxDiscountAmount: context.selected.promotion?.maxDiscountAmount,
          }
        : null,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      discountedSubtotal: quote.discountedSubtotal,
      taxAmount: quote.taxAmount,
      serviceFeeAmount: quote.serviceFeeAmount,
      totalPrice: quote.totalPrice,
    });
  }

  /**
   * Snapshot the booking terms (cancellation + payment) for the quoted stay.
   *
   * Both are resolved per room from the same active rule, with the room-specific
   * rule taking precedence over the hotel-wide default (see
   * `findCancellationRule`). The resolved payment policy is conservative:
   * if any room requires prepayment, the booking does too.
   */
  async getBookingTermsSnapshot(hotelId, roomIds, pricing) {
    const cancellationRooms = [];
    const paymentRooms = [];
    const hotel = await bookingRepository.findCancellationHotel(hotelId);
    const checkInAt = getHotelCheckInDateTime(
      pricing.checkInDate,
      hotel.check_in_time,
      hotel.timezone || 'UTC'
    );
    let allocated = 0;

    for (const roomId of roomIds) {
      const rule = await bookingRepository.findCancellationRule(hotelId, roomId);
      const data = rule?.toJSON ? rule.toJSON() : rule;
      const index = cancellationRooms.length;
      const roomPayable = pricing.rooms[index].discountedSubtotal ?? pricing.rooms[index].subtotal;
      const amountMinor =
        index === roomIds.length - 1
          ? Math.round(pricing.totalPrice * 100) - allocated
          : Math.round(
              (pricing.totalPrice * 100 * roomPayable) /
                (pricing.discountedSubtotal || pricing.subtotal || 1)
            );
      allocated += amountMinor;
      const hours = data?.free_cancellation_until_hours_before_checkin;

      cancellationRooms.push({
        amountMinor,
        freeCancellationDeadline:
          hours === null || hours === undefined
            ? null
            : new Date(checkInAt.getTime() - hours * 3600000).toISOString(),
        roomId,
        ruleId: data?.id || null,
        isRefundable: data ? !!data.is_refundable : false,
        freeCancellationUntilHoursBeforeCheckin:
          data?.free_cancellation_until_hours_before_checkin ?? null,
        refundPercentBeforeDeadline: data?.refund_percent_before_deadline
          ? parseFloat(data.refund_percent_before_deadline)
          : 0,
        refundPercentAfterDeadline: data?.refund_percent_after_deadline
          ? parseFloat(data.refund_percent_after_deadline)
          : 0,
      });

      paymentRooms.push({
        roomId,
        policy: normalizePaymentPolicy(data?.payment_policy),
        ruleId: data?.id || null,
      });
    }

    return {
      cancellationPolicy: {
        version: 2,
        checkInAt: checkInAt.toISOString(),
        timezone: hotel.timezone || 'UTC',
        rooms: cancellationRooms,
      },
      paymentPolicy: {
        mode: resolvePaymentPolicy(paymentRooms.map((room) => room.policy)),
        checkInAt: checkInAt.toISOString(),
        rooms: paymentRooms,
      },
    };
  }

  async getCancellationPolicySnapshot(hotelId, roomIds, pricing) {
    const terms = await this.getBookingTermsSnapshot(hotelId, roomIds, pricing);
    return terms.cancellationPolicy;
  }

  getNights(checkInDate, checkOutDate) {
    const start = typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    const end = typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;
    if (start >= end) {
      throw new ApiError(400, 'INVALID_DATE_RANGE', 'checkOutDate must be after checkInDate');
    }

    const dates = [];
    const current = new Date(start);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  toDateString(date) {
    return typeof date === 'string' ? date : date.toISOString().split('T')[0];
  }

  normalizeRate(value) {
    const parsed = parseFloat(value || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed > 1 ? parsed / 100 : parsed;
  }

  roundMoney(value) {
    return Math.round(parseFloat(value || 0) * 100) / 100;
  }
}

module.exports = new PricingService();
