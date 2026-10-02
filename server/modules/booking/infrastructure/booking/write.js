const { Op } = require('sequelize');

const { Bookings, BookingRooms } = require('@models/index.js');
const sequelize = require('@config/database.config');

/**
 * Booking write operations (bookings and booking rooms).
 */

async function updateByBookingCode(bookingCode, updateData, options = {}) {
  const [count] = await Bookings.update(updateData, {
    where: { booking_code: bookingCode },
    ...options,
  });
  return count;
}

async function updateStatus(bookingId, status, options = {}) {
  return await Bookings.update(
    { status },
    {
      where: { id: bookingId },
      ...options,
    }
  );
}

async function updateStatusByDates(buyerId) {
  return await Bookings.update(
    {
      status: sequelize.literal(`CASE
          WHEN (CURRENT_DATE() BETWEEN check_in_date AND check_out_date) THEN 'checked_in'
          WHEN CURRENT_DATE() > check_out_date THEN 'completed'
          ELSE status
          END`),
    },
    {
      where: {
        buyer_id: buyerId,
        status: {
          [Op.in]: ['confirmed', 'checked_in'],
        },
      },
    }
  );
}

async function createBookingRoom(roomData, options = {}) {
  return await BookingRooms.create(
    {
      booking_id: roomData.bookingId || roomData.booking_id,
      room_id: roomData.roomId || roomData.room_id,
      quantity: roomData.quantity || 1,
      nightly_price_snapshot: roomData.nightlyPriceSnapshot || roomData.nightly_price_snapshot,
      subtotal: roomData.subtotal || 0,
      total_price: roomData.totalPrice || roomData.total_price || roomData.subtotal || 0,
    },
    options
  );
}

async function bulkCreateBookingRooms(rooms, options = {}) {
  return await BookingRooms.bulkCreate(
    rooms.map((room) => ({
      booking_id: room.bookingId || room.booking_id,
      room_id: room.roomId || room.room_id,
      quantity: room.quantity || 1,
      nightly_price_snapshot: room.nightlyPriceSnapshot || room.nightly_price_snapshot,
      subtotal: room.subtotal || 0,
      total_price: room.totalPrice || room.total_price || room.subtotal || 0,
    })),
    options
  );
}

async function create(bookingData, options = {}) {
  return await Bookings.create(bookingData, options);
}

async function update(bookingId, updateData, options = {}) {
  return await Bookings.update(updateData, {
    where: { id: bookingId },
    ...options,
  });
}

module.exports = {
  updateByBookingCode,
  updateStatus,
  updateStatusByDates,
  createBookingRoom,
  bulkCreateBookingRooms,
  create,
  update,
};
