const redisClient = require('@config/redis.config');

async function checkUserHold(userId) {}
async function getHoldFromCache(holdId) {}
async function cacheHold(hold) {}
async function removeHoldFromCache(hold) {}

module.exports = {
  checkUserHold,
  cacheHold,
  removeHoldFromCache,
};
