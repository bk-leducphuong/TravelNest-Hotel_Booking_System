const bookingRepository = require('../../infrastructure/booking-admin.repository');

/**
 * Front-desk board for a single day: arrivals, departures and in-house.
 * Defaults to today (UTC) when no date is given.
 */
async function getReservationBoard(hotelId, { date } = {}) {
  const day = date || new Date().toISOString().slice(0, 10);
  const { arrivals, departures, inHouse } = await bookingRepository.findBoard({
    hotelId,
    date: day,
  });

  return { hotelId, date: day, arrivals, departures, inHouse };
}

module.exports = { getReservationBoard };
