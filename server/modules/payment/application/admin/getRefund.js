const ApiError = require('@utils/ApiError');

const refundRepository = require('../../infrastructure/refund.repository');

async function getRefund(refundId) {
  const refund = await refundRepository.findByIdWithRelations(refundId);

  if (!refund) {
    throw new ApiError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  }

  return refund;
}

module.exports = { getRefund };
