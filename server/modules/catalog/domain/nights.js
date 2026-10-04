/**
 * Compute number of nights from check-in and check-out dates (inclusive of check-in, exclusive of check-out).
 * @param {string} checkInDate - ISO date string (YYYY-MM-DD)
 * @param {string} checkOutDate - ISO date string (YYYY-MM-DD)
 * @returns {number} Number of nights
 */
function computeNumberOfNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return undefined;
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
}

module.exports = {
  computeNumberOfNights,
};
