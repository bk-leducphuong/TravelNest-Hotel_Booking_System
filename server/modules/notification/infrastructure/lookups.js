const { Hotels } = require('@models');

/**
 * Look up a hotel's owner for composing owner-facing notifications.
 */
async function getHotelWithOwner(hotelId) {
  return Hotels.findByPk(hotelId, {
    attributes: ['id', 'name', 'hotel_owner_id'],
  });
}

module.exports = { getHotelWithOwner };
