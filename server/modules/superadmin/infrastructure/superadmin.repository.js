const { hotels: Hotels, users: Users, bookings: Bookings } = require('@models/index.js');

/**
 * Superadmin repository - platform-wide (cross-tenant) reads.
 *
 * This is the only layer in the module that touches Sequelize models. v1 reads
 * counts directly from MySQL; heavier aggregates should move to the analytics
 * service / ClickHouse as traffic grows (see SUPERADMIN_PLAN.md §5.6).
 */

const HOTEL_STATUSES = ['active', 'inactive', 'pending', 'suspended'];
const USER_STATUSES = ['active', 'inactive', 'banned'];

async function countByStatus(Model, statuses, where = {}) {
  const counts = {};

  for (const status of statuses) {
    counts[status] = await Model.count({ where: { ...where, status } });
  }

  return counts;
}

/**
 * Platform-wide KPI counts for the monitoring overview.
 */
async function getPlatformOverview() {
  const [hotelTotal, hotelByStatus, userTotal, userByStatus, bookingTotal] = await Promise.all([
    Hotels.count(),
    countByStatus(Hotels, HOTEL_STATUSES),
    Users.count(),
    countByStatus(Users, USER_STATUSES),
    Bookings.count(),
  ]);

  return {
    hotels: { total: hotelTotal, byStatus: hotelByStatus },
    users: { total: userTotal, byStatus: userByStatus },
    bookings: { total: bookingTotal },
  };
}

module.exports = {
  getPlatformOverview,
  HOTEL_STATUSES,
  USER_STATUSES,
};
