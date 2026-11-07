const { queueRefund } = require('../refund-obligations');

async function initiateRefund(transactionId, payload = {}, context = {}) {
  return queueRefund(transactionId, payload, context);
}

module.exports = { initiateRefund };
