const { evaluateSnapshot } = require('../../domain/cancellation-policy');

async function evaluateBookingCancellationPolicy(booking, now = new Date()) {
  return evaluateSnapshot(booking.toJSON ? booking.toJSON() : booking, now);
}

module.exports = { evaluateBookingCancellationPolicy };
