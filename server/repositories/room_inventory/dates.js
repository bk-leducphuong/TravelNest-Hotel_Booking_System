/**
 * Date helpers shared by the room-inventory repository modules (pure).
 *
 * Sequelize's DATEONLY type surfaces as a `YYYY-MM-DD` string; these helpers
 * accept either a string or a Date.
 */

function toDateOnly(value) {
  return typeof value === 'string' ? value : value.toISOString().split('T')[0];
}

function toDateObject(value) {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Every Date in [startDate, endDate) — end date is exclusive. */
function enumerateDateObjects(startDate, endDate) {
  const start = toDateObject(startDate);
  const end = toDateObject(endDate);

  const dates = [];
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/** Every `YYYY-MM-DD` string in [startDate, endDate) — end date is exclusive. */
function enumerateDateStrings(startDate, endDate) {
  return enumerateDateObjects(startDate, endDate).map((date) => date.toISOString().split('T')[0]);
}

module.exports = { toDateOnly, toDateObject, enumerateDateObjects, enumerateDateStrings };
