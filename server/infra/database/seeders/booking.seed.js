/**
 * Booking Seed File
 *
 * Generates fake booking data using Faker.js and seeds the database.
 * Requires existing hotels, rooms, and users (customers) in the database.
 *
 * Usage:
 *   - Run directly: node seed/booking.seed.js
 *   - Import and use: const { seedBookings } = require('./seed/booking.seed');
 *
 * Options:
 *   - bookingsPerHotel: Number of bookings to generate per hotel (default: 20-50 random)
 *   - clearExisting: Whether to clear existing bookings before seeding (default: false)
 *   - dateRange: Date range for bookings (default: past 6 months to future 3 months)
 *
 * Note: This seed file requires hotels, rooms, and users (customers) to exist in the database first.
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});
const { faker } = require('@faker-js/faker');
const db = require('../models');
const sequelize = require('../config/database.config');
const { bookings, hotels, rooms, users, room_inventory } = db;

// Booking status distribution (weighted)
const BOOKING_STATUSES = [
  { status: 'completed', weight: 40 },
  { status: 'confirmed', weight: 30 },
  { status: 'checked in', weight: 5 },
  { status: 'cancelled', weight: 20 },
  { status: 'no show', weight: 5 },
];

/**
 * Generate a unique booking code
 * Format: BK + timestamp + random alphanumeric
 * @returns {string} Booking code
 */
function generateBookingCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = faker.string.alphanumeric(6).toUpperCase();
  return `BK${timestamp}${random}`;
}

/**
 * Calculate number of nights between check-in and check-out
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {number} Number of nights
 */
function calculateNights(checkIn, checkOut) {
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Generate a random booking status based on weights
 * @returns {string} Booking status
 */
function generateBookingStatus() {
  const totalWeight = BOOKING_STATUSES.reduce(
    (sum, item) => sum + item.weight,
    0
  );
  let random = faker.number.int({ min: 1, max: totalWeight });

  for (const item of BOOKING_STATUSES) {
    random -= item.weight;
    if (random <= 0) {
      return item.status;
    }
  }

  return 'confirmed'; // Fallback
}

/**
 * Generate check-in and check-out dates
 * @param {Object} options - Options
 * @param {Date} options.startDate - Start date range (default: 6 months ago)
 * @param {Date} options.endDate - End date range (default: 3 months from now)
 * @returns {Object} Object with checkInDate and checkOutDate
 */
function generateBookingDates(options = {}) {
  const { startDate, endDate } = options;

  const defaultStartDate = new Date();
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);

  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

  const minDate = startDate || defaultStartDate;
  const maxDate = endDate || defaultEndDate;

  // Generate check-in date
  const checkInDate = faker.date.between({
    from: minDate,
    to: maxDate,
  });

  // Generate check-out date (1-14 nights after check-in)
  const nights = faker.number.int({ min: 1, max: 14 });
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + nights);

  // Ensure check-out is within max date range
  if (checkOutDate > maxDate) {
    checkOutDate.setTime(maxDate.getTime());
    // Adjust check-in if needed
    if (checkInDate >= checkOutDate) {
      checkInDate.setTime(checkOutDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
  }

  return {
    checkInDate: checkInDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
    checkOutDate: checkOutDate.toISOString().split('T')[0],
    nights: calculateNights(checkInDate, checkOutDate),
  };
}

/**
 * Calculate total price for a booking
 * @param {number} pricePerNight - Price per night
 * @param {number} nights - Number of nights
 * @param {number} quantity - Number of rooms
 * @returns {number} Total price
 */
function calculateTotalPrice(pricePerNight, nights, quantity = 1) {
  const basePrice = pricePerNight * nights * quantity;
  // Add some variation (±10%)
  const variation = faker.number.float({ min: 0.9, max: 1.1 });
  return parseFloat((basePrice * variation).toFixed(2));
}

/**
 * Get or generate price per night for a room
 * @param {number} roomId - Room ID
 * @param {Date} checkInDate - Check-in date
 * @returns {Promise<number>} Price per night
 */
async function getRoomPrice(roomId, checkInDate) {
  // Try to get price from room_inventory
  const inventory = await room_inventory.findOne({
    where: {
      room_id: roomId,
      date: checkInDate,
    },
    attributes: ['price_per_night'],
  });

  if (inventory && inventory.price_per_night) {
    return parseFloat(inventory.price_per_night);
  }

  // Generate a base price if not found in inventory
  // Base price: $50-$500 per night
  return faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
}

/**
 * Generate fake booking data
 * @param {number} buyerId - Buyer (customer) ID
 * @param {number} hotelId - Hotel ID
 * @param {number} roomId - Room ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Booking data object
 */
async function generateBooking(buyerId, hotelId, roomId, options = {}) {
  const { checkInDate, checkOutDate, nights } = generateBookingDates(
    options.dateRange || {}
  );

  // Get room details
  const room = await rooms.findByPk(roomId, {
    attributes: ['max_guests', 'quantity'],
  });

  const maxGuests = room?.max_guests || 2;
  const roomQuantity = room?.quantity || 1;

  // Generate number of guests (1 to max_guests)
  const numberOfGuests = faker.number.int({
    min: 1,
    max: Math.min(maxGuests, 6),
  });

  // Generate quantity (number of rooms booked, 1 to available)
  const quantity = faker.number.int({
    min: 1,
    max: Math.min(roomQuantity, 3),
  });

  // Get price per night
  const pricePerNight = await getRoomPrice(roomId, checkInDate);

  // Calculate total price
  const totalPrice = calculateTotalPrice(pricePerNight, nights, quantity);

  // Generate status
  const status = generateBookingStatus();

  const booking = {
    buyer_id: buyerId,
    hotel_id: hotelId,
    room_id: roomId,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    number_of_guests: numberOfGuests,
    quantity: quantity,
    total_price: totalPrice,
    status: status,
    booking_code: generateBookingCode(),
    created_at: faker.date.past({ years: 1 }),
    updated_at: faker.date.recent({ days: 30 }),
  };

  return booking;
}

/**
 * Seed bookings into the database
 * @param {Object} options - Seeding options
 * @param {number|Object} options.bookingsPerHotel - Number of bookings per hotel (default: random 20-50)
 *   Can be a number or object with min/max: { min: 20, max: 50 }
 * @param {boolean} options.clearExisting - Whether to clear existing bookings (default: false)
 * @param {Object} options.dateRange - Date range for bookings
 *   { startDate: Date, endDate: Date }
 * @param {Array<number>} options.hotelIds - Specific hotel IDs to seed (optional, seeds all if not provided)
 */
async function seedBookings(options = {}) {
  const {
    bookingsPerHotel = { min: 20, max: 50 },
    clearExisting = false,
    dateRange = {},
    hotelIds = null,
  } = options;

  try {
    console.log('🌱 Starting booking seeding...');

    // Get all hotels or specific hotels
    let hotelQuery = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelQuery = { id: hotelIds };
    }

    const existingHotels = await hotels.findAll({
      where: hotelQuery,
      attributes: ['id'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return;
    }

    // Get all customers (users with role 'customer')
    const existingCustomers = await users.findAll({
      where: { user_role: 'customer' },
      attributes: ['id'],
    });

    if (existingCustomers.length === 0) {
      console.log(
        '❌ No customers found in database. Please seed users first.'
      );
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);
    console.log(`👥 Found ${existingCustomers.length} customer(s)`);

    // Clear existing bookings if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing bookings...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await bookings.destroy({ where: { hotel_id: hotelIds } });
      } else {
        await bookings.destroy({ where: {}, truncate: true });
      }
      console.log('✅ Existing bookings cleared');
    }

    let totalBookingsCreated = 0;
    const bookingsToCreate = [];

    // Generate bookings for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');

      // Get rooms for this hotel
      const hotelRooms = await rooms.findAll({
        where: { hotel_id: hotelId },
        attributes: ['id'],
      });

      if (hotelRooms.length === 0) {
        console.log(
          `   ⚠️  Skipping hotel ${hotelId}: No rooms found`
        );
        continue;
      }

      // Determine number of bookings for this hotel
      let numBookings;
      if (typeof bookingsPerHotel === 'number') {
        numBookings = bookingsPerHotel;
      } else {
        numBookings = faker.number.int({
          min: bookingsPerHotel.min || 20,
          max: bookingsPerHotel.max || 50,
        });
      }

      // Generate bookings
      for (let i = 0; i < numBookings; i++) {
        // Select a random customer
        const randomCustomer =
          existingCustomers[
            faker.number.int({ min: 0, max: existingCustomers.length - 1 })
          ];
        const buyerId =
          randomCustomer.id || randomCustomer.get?.('id');

        // Select a random room from this hotel
        const randomRoom =
          hotelRooms[
            faker.number.int({ min: 0, max: hotelRooms.length - 1 })
          ];
        const roomId = randomRoom.id || randomRoom.get?.('id');

        const booking = await generateBooking(
          buyerId,
          hotelId,
          roomId,
          { dateRange }
        );
        bookingsToCreate.push(booking);
      }

      console.log(
        `   📅 Generated ${numBookings} booking(s) for hotel ID ${hotelId}`
      );
    }

    // Bulk create all bookings
    if (bookingsToCreate.length > 0) {
      console.log(
        `\n💾 Creating ${bookingsToCreate.length} booking(s) in database...`
      );
      await bookings.bulkCreate(bookingsToCreate, {
        validate: true,
        ignoreDuplicates: true,
      });
      totalBookingsCreated = bookingsToCreate.length;
      console.log(`✅ ${totalBookingsCreated} booking(s) created successfully`);
    }

    // Display summary
    const totalBookings = await bookings.count();
    const bookingsByHotel = await bookings.findAll({
      attributes: [
        'hotel_id',
        [sequelize.fn('COUNT', sequelize.col('booking_id')), 'booking_count'],
      ],
      group: ['hotel_id'],
      raw: true,
    });

    const bookingsByStatus = await bookings.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    console.log('\n📊 Booking Summary:');
    console.log(`   Total bookings: ${totalBookings}`);
    console.log(`   Bookings created in this run: ${totalBookingsCreated}`);

    if (bookingsByStatus.length > 0) {
      console.log('\n   Bookings by status:');
      bookingsByStatus.forEach((item) => {
        console.log(`     ${item.status || 'null'}: ${item.count}`);
      });
    }

    if (bookingsByHotel.length > 0 && bookingsByHotel.length <= 10) {
      console.log('\n   Bookings per hotel:');
      bookingsByHotel.forEach((item) => {
        console.log(`     Hotel ${item.hotel_id}: ${item.booking_count} booking(s)`);
      });
    }
  } catch (error) {
    console.error('❌ Error seeding bookings:', error);
    throw error;
  }
}

/**
 * Seed bookings for a specific hotel
 * @param {number} hotelId - Hotel ID
 * @param {number} count - Number of bookings to generate
 * @param {Object} dateRange - Date range for bookings
 * @returns {Promise<Array>} Created bookings
 */
async function seedBookingsForHotel(hotelId, count = 30, dateRange = {}) {
  try {
    // Verify hotel exists
    const hotel = await hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    // Get rooms for this hotel
    const hotelRooms = await rooms.findAll({
      where: { hotel_id: hotelId },
      attributes: ['room_id'],
    });

    if (hotelRooms.length === 0) {
      throw new Error(`No rooms found for hotel ${hotelId}`);
    }

    // Get customers
    const existingCustomers = await users.findAll({
      where: { user_role: 'customer' },
      attributes: ['user_id'],
    });

    if (existingCustomers.length === 0) {
      throw new Error('No customers found in database');
    }

    const bookingsToCreate = [];

    for (let i = 0; i < count; i++) {
      const randomCustomer =
        existingCustomers[
          faker.number.int({ min: 0, max: existingCustomers.length - 1 })
        ];
      const buyerId = randomCustomer.id || randomCustomer.get?.('id');

      const randomRoom =
        hotelRooms[
          faker.number.int({ min: 0, max: hotelRooms.length - 1 })
        ];
      const roomId = randomRoom.room_id || randomRoom.get?.('room_id');

      const booking = await generateBooking(
        buyerId,
        hotelId,
        roomId,
        { dateRange }
      );
      bookingsToCreate.push(booking);
    }

    const createdBookings = await bookings.bulkCreate(bookingsToCreate, {
      validate: true,
    });

    console.log(
      `✅ Created ${createdBookings.length} booking(s) for hotel ${hotelId}`
    );
    return createdBookings;
  } catch (error) {
    console.error(`❌ Error seeding bookings for hotel ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Generate booking data without saving to database (for testing)
 * @param {number} buyerId - Buyer ID
 * @param {number} hotelId - Hotel ID
 * @param {number} roomId - Room ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Booking data object
 */
async function generateBookingData(buyerId, hotelId, roomId, options = {}) {
  return await generateBooking(buyerId, hotelId, roomId, options);
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed bookings
      await seedBookings({
        bookingsPerHotel: { min: 20, max: 50 }, // Random 20-50 bookings per hotel
        clearExisting: false, // Set to true to clear existing bookings
        dateRange: {
          // Optional: specify date range
          // startDate: new Date('2024-01-01'),
          // endDate: new Date('2024-12-31'),
        },
        // hotelIds: [1, 2, 3], // Optional: seed only specific hotels
      });

      // Close database connection
      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedBookings,
  seedBookingsForHotel,
  generateBookingData,
  generateBooking,
};
