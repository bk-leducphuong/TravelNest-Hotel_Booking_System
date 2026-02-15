/**
 * Notification Seed File
 *
 * Generates fake notification data using Faker.js and seeds the database.
 * Requires existing hotels and users in the database.
 *
 * Usage:
 *   - Run directly: node seed/notification.seed.js
 *   - Import and use: const { seedNotifications } = require('./seed/notification.seed');
 *
 * Options:
 *   - notificationsPerHotel: Number of notifications to generate per hotel (default: 10-30 random)
 *   - clearExisting: Whether to clear existing notifications before seeding (default: false)
 *
 * Note: This seed file requires hotels and users to exist in the database first.
 * Notifications are sent from users (sender_id) to hotels (reciever_id).
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
const { notifications, hotels, users, bookings } = db;

// Notification types
const NOTIFICATION_TYPES = [
  'booking',
  'review',
  'cancellation',
  'payment',
  'reminder',
  'update',
  'system',
  'promotion',
];

// Notification message templates by type
const NOTIFICATION_MESSAGES = {
  booking: [
    'New booking received: {customerName} booked {rooms} room(s) from {checkIn} to {checkOut}',
    'Booking confirmation: {customerName} has made a reservation for {guests} guests',
    'New reservation: {customerName} booked {rooms} room(s) for {nights} nights',
    'Booking alert: {customerName} has confirmed a booking from {checkIn} to {checkOut}',
  ],
  review: [
    'New review received: {customerName} left a {rating}-star review',
    'Review notification: {customerName} has reviewed your hotel',
    'New feedback: {customerName} posted a review with {rating} stars',
    'Review update: {customerName} shared their experience',
  ],
  cancellation: [
    'Booking cancelled: {customerName} cancelled their reservation',
    'Cancellation notice: {customerName} has cancelled booking {bookingCode}',
    'Reservation cancelled: {customerName} cancelled their booking',
  ],
  payment: [
    'Payment received: {customerName} has completed payment for booking {bookingCode}',
    'Payment confirmation: Payment received from {customerName}',
    'Payment notification: {customerName} paid for their reservation',
  ],
  reminder: [
    'Reminder: Check-in reminder for {customerName} arriving on {checkIn}',
    'Upcoming booking: {customerName} will check in on {checkIn}',
    'Check-in reminder: {customerName} is arriving tomorrow',
  ],
  update: [
    'Booking updated: {customerName} modified their reservation',
    'Reservation change: {customerName} updated their booking details',
    'Update notification: Changes made to {customerName}\'s booking',
  ],
  system: [
    'System maintenance scheduled for tonight',
    'System update: New features available',
    'Maintenance notice: Scheduled downtime this weekend',
  ],
  promotion: [
    'New promotion: Special discount available this month',
    'Promotional offer: Limited time discount for bookings',
    'Special deal: 20% off for new bookings',
  ],
};

/**
 * Generate a notification message based on type
 * @param {string} type - Notification type
 * @param {Object} data - Data for message template
 * @returns {string} Notification message
 */
function generateNotificationMessage(type, data = {}) {
  const templates = NOTIFICATION_MESSAGES[type] || NOTIFICATION_MESSAGES.system;
  let message = faker.helpers.arrayElement(templates);

  // Replace placeholders
  const placeholders = {
    customerName: data.customerName || faker.person.fullName(),
    rooms: data.rooms || faker.number.int({ min: 1, max: 3 }),
    checkIn: data.checkIn || faker.date.future().toLocaleDateString(),
    checkOut: data.checkOut || faker.date.future().toLocaleDateString(),
    guests: data.guests || faker.number.int({ min: 1, max: 6 }),
    nights: data.nights || faker.number.int({ min: 1, max: 14 }),
    rating: data.rating || faker.number.int({ min: 1, max: 5 }),
    bookingCode: data.bookingCode || `BK${faker.string.alphanumeric(8).toUpperCase()}`,
  };

  Object.keys(placeholders).forEach((key) => {
    message = message.replace(`{${key}}`, placeholders[key]);
  });

  return message;
}

/**
 * Generate fake notification data
 * @param {number} senderId - Sender (user) ID
 * @param {number} receiverId - Receiver (hotel) ID
 * @param {Object} options - Options
 * @returns {Object} Notification data object
 */
function generateNotification(senderId, receiverId, options = {}) {
  const notificationType = options.type || faker.helpers.arrayElement(NOTIFICATION_TYPES);

  // Get customer name if sender is a user
  let customerName = null;
  if (senderId && senderId > 0) {
    customerName = faker.person.fullName();
  }

  // Generate message based on type
  const message = generateNotificationMessage(notificationType, {
    customerName,
    ...options.data,
  });

  // Determine if notification is read (older notifications more likely to be read)
  const isRead = options.isRead !== undefined
    ? options.isRead
    : faker.datatype.boolean({ probability: 0.3 }); // 30% chance of being read

  const notification = {
    sender_id: senderId,
    reciever_id: receiverId,
    notification_type: notificationType,
    message: message,
    is_read: isRead,
    created_at: faker.date.past({ years: 1 }),
  };

  return notification;
}

/**
 * Seed notifications into the database
 * @param {Object} options - Seeding options
 * @param {number|Object} options.notificationsPerHotel - Number of notifications per hotel (default: random 10-30)
 *   Can be a number or object with min/max: { min: 10, max: 30 }
 * @param {boolean} options.clearExisting - Whether to clear existing notifications (default: false)
 * @param {Array<number>} options.hotelIds - Specific hotel IDs to seed (optional, seeds all if not provided)
 * @param {boolean} options.useBookings - Whether to use existing bookings for notification data (default: false)
 */
async function seedNotifications(options = {}) {
  const {
    notificationsPerHotel = { min: 10, max: 30 },
    clearExisting = false,
    hotelIds = null,
    useBookings = false,
  } = options;

  try {
    console.log('🌱 Starting notification seeding...');

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

    // Get all users (can be customers, partners, or admins as senders)
    const existingUsers = await users.findAll({
      attributes: ['id', 'full_name'],
    });

    if (existingUsers.length === 0) {
      console.log('❌ No users found in database. Please seed users first.');
      return;
    }

    // Get bookings if useBookings is true
    let existingBookings = [];
    if (useBookings) {
      existingBookings = await bookings.findAll({
        attributes: [
          'booking_id',
          'booking_code',
          'buyer_id',
          'hotel_id',
          'check_in_date',
          'check_out_date',
          'number_of_guests',
          'quantity',
        ],
      });
      console.log(`📋 Found ${existingBookings.length} booking(s)`);
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);
    console.log(`👥 Found ${existingUsers.length} user(s)`);

    // Clear existing notifications if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing notifications...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await notifications.destroy({ where: { reciever_id: hotelIds } });
      } else {
        await notifications.destroy({ where: {}, truncate: true });
      }
      console.log('✅ Existing notifications cleared');
    }

    let totalNotificationsCreated = 0;
    const notificationsToCreate = [];

    // Generate notifications for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');

      // Get bookings for this hotel if using bookings
      const hotelBookings = useBookings
        ? existingBookings.filter(
            (b) => (b.hotel_id || b.get?.('hotel_id')) === hotelId
          )
        : [];

      // Determine number of notifications for this hotel
      let numNotifications;
      if (typeof notificationsPerHotel === 'number') {
        numNotifications = notificationsPerHotel;
      } else {
        numNotifications = faker.number.int({
          min: notificationsPerHotel.min || 10,
          max: notificationsPerHotel.max || 30,
        });
      }

      // Generate notifications
      for (let i = 0; i < numNotifications; i++) {
        // Select a random user as sender (or system sender with ID 0)
        const useSystemSender = faker.datatype.boolean({ probability: 0.1 }); // 10% system notifications
        let senderId = 0;

        if (!useSystemSender) {
          const randomUser =
            existingUsers[
              faker.number.int({ min: 0, max: existingUsers.length - 1 })
            ];
          senderId = randomUser.id || randomUser.get?.('id');
        }

        // Determine notification type
        let notificationType = faker.helpers.arrayElement(NOTIFICATION_TYPES);
        let notificationData = {};

        // If using bookings and type is booking-related, use real booking data
        if (
          useBookings &&
          hotelBookings.length > 0 &&
          ['booking', 'cancellation', 'payment', 'reminder', 'update'].includes(
            notificationType
          ) &&
          faker.datatype.boolean()
        ) {
          const randomBooking =
            hotelBookings[
              faker.number.int({ min: 0, max: hotelBookings.length - 1 })
            ];
          const bookingCode =
            randomBooking.booking_code || randomBooking.get?.('booking_code');
          const buyerId =
            randomBooking.buyer_id || randomBooking.get?.('buyer_id');
          const checkIn =
            randomBooking.check_in_date || randomBooking.get?.('check_in_date');
          const checkOut =
            randomBooking.check_out_date ||
            randomBooking.get?.('check_out_date');
          const guests =
            randomBooking.number_of_guests ||
            randomBooking.get?.('number_of_guests');
          const rooms =
            randomBooking.quantity || randomBooking.get?.('quantity');

          // Get customer name
          const buyer = await users.findByPk(buyerId, {
            attributes: ['full_name'],
          });
          const customerName = buyer?.full_name || faker.person.fullName();

          notificationData = {
            customerName,
            bookingCode,
            checkIn: new Date(checkIn).toLocaleDateString(),
            checkOut: new Date(checkOut).toLocaleDateString(),
            guests,
            rooms,
            nights: Math.ceil(
              (new Date(checkOut) - new Date(checkIn)) /
                (1000 * 60 * 60 * 24)
            ),
          };

          // Override sender to booking buyer for booking-related notifications
          if (notificationType === 'booking' && buyerId) {
            senderId = buyerId;
          }
        }

        const notification = generateNotification(senderId, hotelId, {
          type: notificationType,
          data: notificationData,
        });

        notificationsToCreate.push(notification);
      }

      console.log(
        `   🔔 Generated ${numNotifications} notification(s) for hotel ID ${hotelId}`
      );
    }

    // Bulk create all notifications
    if (notificationsToCreate.length > 0) {
      console.log(
        `\n💾 Creating ${notificationsToCreate.length} notification(s) in database...`
      );
      await notifications.bulkCreate(notificationsToCreate, {
        validate: true,
        ignoreDuplicates: true,
      });
      totalNotificationsCreated = notificationsToCreate.length;
      console.log(
        `✅ ${totalNotificationsCreated} notification(s) created successfully`
      );
    }

    // Display summary
    const totalNotifications = await notifications.count();
    const notificationsByHotel = await notifications.findAll({
      attributes: [
        'reciever_id',
        [
          sequelize.fn('COUNT', sequelize.col('notification_id')),
          'notification_count',
        ],
      ],
      group: ['reciever_id'],
      raw: true,
    });

    const notificationsByType = await notifications.findAll({
      attributes: [
        'notification_type',
        [
          sequelize.fn('COUNT', sequelize.col('notification_id')),
          'count',
        ],
      ],
      group: ['notification_type'],
      raw: true,
    });

    const readCount = await notifications.count({ where: { is_read: true } });
    const unreadCount = await notifications.count({ where: { is_read: false } });

    console.log('\n📊 Notification Summary:');
    console.log(`   Total notifications: ${totalNotifications}`);
    console.log(`   Notifications created in this run: ${totalNotificationsCreated}`);
    console.log(`   Read: ${readCount}`);
    console.log(`   Unread: ${unreadCount}`);

    if (notificationsByType.length > 0) {
      console.log('\n   Notifications by type:');
      notificationsByType.forEach((item) => {
        console.log(
          `     ${item.notification_type || 'null'}: ${item.count}`
        );
      });
    }

    if (notificationsByHotel.length > 0 && notificationsByHotel.length <= 10) {
      console.log('\n   Notifications per hotel:');
      notificationsByHotel.forEach((item) => {
        console.log(
          `     Hotel ${item.reciever_id}: ${item.notification_count} notification(s)`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
}

/**
 * Seed notifications for a specific hotel
 * @param {number} hotelId - Hotel ID
 * @param {number} count - Number of notifications to generate
 * @param {boolean} useBookings - Whether to use existing bookings
 * @returns {Promise<Array>} Created notifications
 */
async function seedNotificationsForHotel(
  hotelId,
  count = 20,
  useBookings = false
) {
  try {
    // Verify hotel exists
    const hotel = await hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    // Get users
    const existingUsers = await users.findAll({
      attributes: ['id', 'full_name'],
    });

    if (existingUsers.length === 0) {
      throw new Error('No users found in database');
    }

    // Get bookings if useBookings is true
    let hotelBookings = [];
    if (useBookings) {
      hotelBookings = await bookings.findAll({
        where: { hotel_id: hotelId },
        attributes: [
          'booking_id',
          'booking_code',
          'buyer_id',
          'check_in_date',
          'check_out_date',
          'number_of_guests',
          'quantity',
        ],
      });
    }

    const notificationsToCreate = [];

    for (let i = 0; i < count; i++) {
      const useSystemSender = faker.datatype.boolean({ probability: 0.1 });
      let senderId = 0;

      if (!useSystemSender) {
        const randomUser =
          existingUsers[
            faker.number.int({ min: 0, max: existingUsers.length - 1 })
          ];
        senderId = randomUser.user_id || randomUser.get?.('user_id');
      }

      let notificationType = faker.helpers.arrayElement(NOTIFICATION_TYPES);
      let notificationData = {};

      if (
        useBookings &&
        hotelBookings.length > 0 &&
        ['booking', 'cancellation', 'payment', 'reminder', 'update'].includes(
          notificationType
        ) &&
        faker.datatype.boolean()
      ) {
        const randomBooking =
          hotelBookings[
            faker.number.int({ min: 0, max: hotelBookings.length - 1 })
          ];
        const bookingCode =
          randomBooking.booking_code || randomBooking.get?.('booking_code');
        const buyerId =
          randomBooking.buyer_id || randomBooking.get?.('buyer_id');
        const checkIn =
          randomBooking.check_in_date || randomBooking.get?.('check_in_date');
        const checkOut =
          randomBooking.check_out_date ||
          randomBooking.get?.('check_out_date');
        const guests =
          randomBooking.number_of_guests ||
          randomBooking.get?.('number_of_guests');
        const rooms =
          randomBooking.quantity || randomBooking.get?.('quantity');

        const buyer = await users.findByPk(buyerId, {
          attributes: ['full_name'],
        });
        const customerName = buyer?.full_name || faker.person.fullName();

        notificationData = {
          customerName,
          bookingCode,
          checkIn: new Date(checkIn).toLocaleDateString(),
          checkOut: new Date(checkOut).toLocaleDateString(),
          guests,
          rooms,
          nights: Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
          ),
        };

        if (notificationType === 'booking' && buyerId) {
          senderId = buyerId;
        }
      }

      const notification = generateNotification(senderId, hotelId, {
        type: notificationType,
        data: notificationData,
      });

      notificationsToCreate.push(notification);
    }

    const createdNotifications = await notifications.bulkCreate(
      notificationsToCreate,
      {
        validate: true,
      }
    );

    console.log(
      `✅ Created ${createdNotifications.length} notification(s) for hotel ${hotelId}`
    );
    return createdNotifications;
  } catch (error) {
    console.error(`❌ Error seeding notifications for hotel ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Generate notification data without saving to database (for testing)
 * @param {number} senderId - Sender ID
 * @param {number} receiverId - Receiver (hotel) ID
 * @param {Object} options - Options
 * @returns {Object} Notification data object
 */
function generateNotificationData(senderId, receiverId, options = {}) {
  return generateNotification(senderId, receiverId, options);
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed notifications
      await seedNotifications({
        notificationsPerHotel: { min: 10, max: 30 }, // Random 10-30 notifications per hotel
        useBookings: false, // Set to true to use existing bookings for notification data
        clearExisting: false, // Set to true to clear existing notifications
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
  seedNotifications,
  seedNotificationsForHotel,
  generateNotificationData,
  generateNotification,
};
