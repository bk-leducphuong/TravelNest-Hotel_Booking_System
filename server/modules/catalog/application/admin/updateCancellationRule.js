const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/** Input field -> hotel_cancellation_rules column. */
const EDITABLE_FIELDS = {
  roomId: 'room_id',
  isRefundable: 'is_refundable',
  freeCancellationUntilHoursBeforeCheckin: 'free_cancellation_until_hours_before_checkin',
  refundPercentBeforeDeadline: 'refund_percent_before_deadline',
  refundPercentAfterDeadline: 'refund_percent_after_deadline',
  cancellationFeeType: 'cancellation_fee_type',
  cancellationFeeValue: 'cancellation_fee_value',
  isActive: 'is_active',
};

/** Update a cancellation rule (scoped to the hotel). Audited. */
async function updateCancellationRule(
  hotelId,
  ruleId,
  payload = {},
  { actorUserId, requestId } = {}
) {
  const existing = await hotelRepository.findCancellationRuleByIdAndHotelId(ruleId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'CANCELLATION_RULE_NOT_FOUND', 'Cancellation rule not found');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'roomId') && payload.roomId) {
    const room = await roomRepository.findByIdAndHotelId(payload.roomId, hotelId);
    if (!room) {
      throw new ApiError(400, 'ROOM_NOT_IN_HOTEL', 'Room does not belong to this hotel');
    }
  }

  const values = {};
  for (const [input, column] of Object.entries(EDITABLE_FIELDS)) {
    if (payload[input] !== undefined) {
      values[column] = payload[input];
    }
  }

  if (Object.keys(values).length === 0) {
    throw new ApiError(
      400,
      'NO_CANCELLATION_RULE_CHANGES',
      `No editable fields provided (${Object.keys(EDITABLE_FIELDS).join(', ')})`
    );
  }

  await hotelRepository.updateCancellationRule(ruleId, values);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'cancellation_rule.updated',
    entityType: 'hotel_cancellation_rule',
    entityId: ruleId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: values,
    requestId,
  });

  const rule = await hotelRepository.findCancellationRuleByIdAndHotelId(ruleId, hotelId);
  return { rule };
}

module.exports = { updateCancellationRule, EDITABLE_FIELDS };
