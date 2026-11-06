const { Op } = require('sequelize');

const {
  Bookings,
  BookingRooms,
  Cities,
  Hotels,
  Images,
  Rooms,
  Transactions,
  HotelCancellationRules,
  reviews: Reviews,
} = require('@platform/database');

/**
 * Booking read queries.
 */

/**
 * Build the shared WHERE/include for a buyer's bookings, applying the optional
 * cancelled, review-state and booked-after filters.
 */
function buildBuyerQuery(buyerId, options = {}) {
  const { excludeCancelled = true, reviewed, bookedAfter } = options;

  const where = {
    buyer_id: buyerId,
  };

  if (excludeCancelled) {
    where.status = {
      [Op.ne]: 'cancelled',
    };
  }

  // Rolling-window trip filter (e.g. bookings made in the last week/month/year).
  if (bookedAfter) {
    where.created_at = { [Op.gte]: bookedAfter };
  }

  let include;

  // Optional filter by review state, using the `Booking.hasMany(reviews)`
  // association. `reviewed: false` keeps bookings whose review row is absent
  // (LEFT JOIN + IS NULL); `reviewed: true` keeps only reviewed bookings.
  if (typeof reviewed === 'boolean') {
    include = [
      {
        model: Reviews,
        as: 'reviews',
        attributes: [],
        required: reviewed === true,
      },
    ];

    if (reviewed === false) {
      where['$reviews.id$'] = null;
    }
  }

  return { where, include };
}

async function findByBuyerId(buyerId, options = {}) {
  const { limit, offset = 0 } = options;
  const { where, include } = buildBuyerQuery(buyerId, options);

  const query = {
    where,
    order: [['created_at', 'DESC']],
  };

  if (include) {
    query.include = include;
    // `limit` + a hasMany include would otherwise make Sequelize wrap the
    // select in a subquery, leaving `$reviews.id$` inside a scope where the
    // reviews join doesn't exist (MySQL: Unknown column 'reviews.id').
    // `reviews.booking_id` is UNIQUE, so a flat join cannot duplicate bookings.
    query.subQuery = false;
  }

  if (typeof limit === 'number') {
    query.limit = limit;
    query.offset = offset;
  }

  return await Bookings.findAll(query);
}

async function countByBuyerId(buyerId, options = {}) {
  const { where, include } = buildBuyerQuery(buyerId, options);

  const query = {
    where,
    distinct: true,
    col: 'id',
  };

  if (include) {
    query.include = include;
  }

  return await Bookings.count(query);
}

async function findById(bookingId) {
  return await Bookings.findOne({
    where: { id: bookingId },
  });
}

async function findByBookingCode(bookingCode, options = {}) {
  return await Bookings.findOne({
    where: { booking_code: bookingCode },
    include: options.include || [],
    ...options,
  });
}

async function findAllByBookingCode(bookingCode, options = {}) {
  return await Bookings.findAll({
    where: { booking_code: bookingCode },
    ...options,
  });
}

async function findCompletedByCodeAndBuyer({ bookingCode, buyerId, hotelId }) {
  return await Bookings.findOne({
    where: {
      booking_code: bookingCode,
      buyer_id: buyerId,
      hotel_id: hotelId,
      status: 'completed',
    },
  });
}

async function findExpiredPending(options = {}) {
  const { limit = 100, order = [['expires_at', 'ASC']], ...queryOptions } = options;

  return await Bookings.findAll({
    where: {
      status: {
        [Op.in]: ['pending', 'pending_payment'],
      },
      expires_at: {
        [Op.ne]: null,
        [Op.lte]: new Date(),
      },
    },
    limit,
    order,
    ...queryOptions,
  });
}

async function findExpiryContextById(bookingId, options = {}) {
  return await Bookings.findOne({
    where: { id: bookingId },
    include: [
      {
        model: BookingRooms,
        as: 'bookingRooms',
      },
      {
        model: Transactions,
        as: 'transaction',
      },
    ],
    ...options,
  });
}

async function findByIdAndBuyerId(bookingId, buyerId) {
  return await Bookings.findOne({
    where: {
      id: bookingId,
      buyer_id: buyerId,
    },
    include: [
      {
        model: BookingRooms,
        as: 'bookingRooms',
        include: [{ model: Rooms, as: 'room', attributes: ['id', 'room_name'] }],
      },
      {
        model: Transactions,
        as: 'transaction',
      },
    ],
  });
}

async function findCancellationContextByIdAndBuyerId(bookingId, buyerId) {
  return await Bookings.findOne({
    where: {
      id: bookingId,
      buyer_id: buyerId,
    },
    include: [
      {
        model: Hotels,
        as: 'hotel',
        attributes: ['id', 'timezone', 'check_in_time'],
      },
      {
        model: BookingRooms,
        as: 'bookingRooms',
        attributes: ['room_id', 'quantity'],
        required: false,
      },
    ],
  });
}

async function findHotelById(hotelId) {
  return await Hotels.findOne({
    where: { id: hotelId },
    attributes: ['id', 'name', 'city_id'],
    include: [
      {
        model: Cities,
        as: 'city',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: Images,
        as: 'images',
        where: { status: 'active' },
        attributes: ['id', 'object_key', 'is_primary', 'display_order'],
        required: false,
      },
    ],
    order: [
      [{ model: Images, as: 'images' }, 'is_primary', 'DESC'],
      [{ model: Images, as: 'images' }, 'display_order', 'ASC'],
    ],
  });
}

async function findRoomById(roomId) {
  return await Rooms.findOne({
    where: { id: roomId },
    attributes: ['id', 'room_name'],
  });
}

async function findCancellationRule(hotelId, roomId) {
  const sequelize = require('@config/database.config');

  return await HotelCancellationRules.findOne({
    where: {
      hotel_id: hotelId,
      is_active: true,
      [Op.or]: [{ room_id: roomId }, { room_id: null }],
    },
    order: [
      [sequelize.literal(`CASE WHEN room_id IS NULL THEN 1 ELSE 0 END`), 'ASC'],
      ['updated_at', 'DESC'],
    ],
  });
}

async function findBookingWithDetails(bookingId) {
  return await Bookings.findOne({
    where: { id: bookingId },
    include: [
      {
        model: Hotels,
        as: 'hotel',
        attributes: ['id', 'name', 'city_id'],
        include: [
          {
            model: Cities,
            as: 'city',
            attributes: ['id', 'name'],
            required: false,
          },
          {
            model: Images,
            as: 'images',
            where: { status: 'active' },
            attributes: ['id', 'object_key', 'is_primary', 'display_order'],
            required: false,
          },
        ],
      },
      {
        model: Rooms,
        as: 'room',
        attributes: ['id', 'room_name'],
      },
    ],
  });
}

async function findPaymentContextByIdAndBuyerId(bookingId, buyerId, options = {}) {
  return await Bookings.findOne({
    where: {
      id: bookingId,
      buyer_id: buyerId,
    },
    include: [
      {
        model: BookingRooms,
        as: 'bookingRooms',
      },
      {
        model: Transactions,
        as: 'transaction',
      },
    ],
    ...options,
  });
}

async function findDetailedByBookingCodeAndBuyerId(bookingCode, buyerId, options = {}) {
  return await Bookings.findOne({
    where: {
      booking_code: bookingCode,
      buyer_id: buyerId,
    },
    include: [
      {
        model: BookingRooms,
        as: 'bookingRooms',
        include: [{ model: Rooms, as: 'room', attributes: ['id', 'room_name'] }],
      },
      {
        model: Hotels,
        as: 'hotel',
        attributes: ['id', 'name', 'city_id', 'address'],
        include: [
          {
            model: Images,
            as: 'images',
            where: { status: 'active' },
            attributes: ['id', 'object_key', 'is_primary', 'display_order'],
            required: false,
          },
        ],
      },
      {
        model: Transactions,
        as: 'transaction',
      },
    ],
    ...options,
  });
}

module.exports = {
  findByBuyerId,
  countByBuyerId,
  findById,
  findByBookingCode,
  findAllByBookingCode,
  findCompletedByCodeAndBuyer,
  findExpiredPending,
  findExpiryContextById,
  findByIdAndBuyerId,
  findCancellationContextByIdAndBuyerId,
  findHotelById,
  findRoomById,
  findCancellationRule,
  findBookingWithDetails,
  findPaymentContextByIdAndBuyerId,
  findDetailedByBookingCodeAndBuyerId,
};
