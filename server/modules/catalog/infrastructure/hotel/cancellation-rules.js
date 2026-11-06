const { HotelCancellationRules } = require('@platform/database');

/**
 * Cancellation rule reads/writes for the back-office property editor.
 * A rule with `room_id = null` is the hotel-wide default.
 */

async function findCancellationRulesForAdmin(hotelId) {
  return await HotelCancellationRules.findAll({
    where: { hotel_id: hotelId },
    order: [['created_at', 'ASC']],
  });
}

async function findCancellationRuleByIdAndHotelId(ruleId, hotelId) {
  return await HotelCancellationRules.findOne({
    where: { id: ruleId, hotel_id: hotelId },
  });
}

async function createCancellationRule(data) {
  return await HotelCancellationRules.create({
    hotel_id: data.hotelId,
    room_id: data.roomId ?? null,
    is_refundable: data.isRefundable ?? true,
    free_cancellation_until_hours_before_checkin:
      data.freeCancellationUntilHoursBeforeCheckin ?? null,
    refund_percent_before_deadline: data.refundPercentBeforeDeadline ?? 100,
    refund_percent_after_deadline: data.refundPercentAfterDeadline ?? 0,
    cancellation_fee_type: data.cancellationFeeType ?? 'none',
    cancellation_fee_value: data.cancellationFeeValue ?? null,
    is_active: data.isActive ?? true,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function updateCancellationRule(ruleId, values) {
  return await HotelCancellationRules.update(
    { ...values, updated_at: new Date() },
    { where: { id: ruleId } }
  );
}

async function deleteCancellationRule(ruleId) {
  return await HotelCancellationRules.destroy({ where: { id: ruleId } });
}

module.exports = {
  findCancellationRulesForAdmin,
  findCancellationRuleByIdAndHotelId,
  createCancellationRule,
  updateCancellationRule,
  deleteCancellationRule,
};
