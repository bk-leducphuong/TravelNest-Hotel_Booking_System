const roomInventoryRepository = require('@repositories/room_inventory.repository');
const ApiError = require('@utils/ApiError');

class PricingService {
  async quote({ hotelId, rooms, checkInDate, checkOutDate }) {
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      throw new ApiError(400, 'INVALID_ROOMS', 'rooms must be a non-empty array');
    }

    const roomIds = rooms.map((room) => room.roomId || room.room_id);
    const quantityByRoom = new Map(
      rooms.map((room) => [room.roomId || room.room_id, room.quantity || room.roomQuantity || 1])
    );

    const inventories = await roomInventoryRepository.findByRoomsAndDateRange(
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
        totalPrice: roomSubtotal,
      });
    }

    const taxRate = this.normalizeRate(process.env.BOOKING_TAX_RATE || 0);
    const serviceFeeRate = this.normalizeRate(process.env.BOOKING_SERVICE_FEE_RATE || 0);
    const platformCommissionRate = this.normalizeRate(process.env.PLATFORM_FEE_RATE || 0);
    const taxAmount = this.roundMoney(subtotal * taxRate);
    const serviceFeeAmount = this.roundMoney(subtotal * serviceFeeRate);
    const platformCommissionAmount = this.roundMoney(subtotal * platformCommissionRate);
    const totalPrice = this.roundMoney(subtotal + taxAmount + serviceFeeAmount);
    const cancellationPolicy = await this.getCancellationPolicySnapshot(hotelId, roomIds);

    return {
      subtotal,
      taxAmount,
      serviceFeeAmount,
      platformCommissionAmount,
      totalPrice,
      currency: 'USD',
      taxRate,
      serviceFeeRate,
      platformCommissionRate,
      rooms: roomBreakdown,
      cancellationPolicy,
    };
  }

  async getCancellationPolicySnapshot(hotelId, roomIds) {
    let bookingRepository;
    try {
      bookingRepository = require('@repositories/booking.repository');
    } catch (error) {
      bookingRepository = null;
    }
    const snapshots = [];

    for (const roomId of roomIds) {
      const rule = bookingRepository
        ? await bookingRepository.findCancellationRule(hotelId, roomId)
        : null;
      const data = rule?.toJSON ? rule.toJSON() : rule;
      snapshots.push({
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
    }

    return { rooms: snapshots };
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
