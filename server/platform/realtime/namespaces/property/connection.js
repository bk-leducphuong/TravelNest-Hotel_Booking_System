const logger = require('@config/logger.config');

const {
  registerSetActiveHotel,
  registerGetOnlineStaff,
  registerBroadcastToHotel,
} = require('./handlers/hotel');
const { registerSubscribeBookings, registerUpdateBookingStatus } = require('./handlers/booking');
const { registerUpdateInventory } = require('./handlers/inventory');
const { registerSubscribeAnalytics } = require('./handlers/analytics');
const { registerDisconnect, registerError } = require('./handlers/lifecycle');

/**
 * Handle new connection to the /property namespace: join rooms, send the
 * welcome payload, and register the event handlers.
 *
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
function handleConnection(namespace, socket) {
  const userId = socket.user.id;
  const userRoles = socket.user.roles;
  const hotelRoles = socket.user.hotelRoles;

  logger.info(`Property user connected to /property namespace`, {
    userId,
    roles: userRoles,
    hotelCount: hotelRoles.length,
    socketId: socket.id,
  });

  // Join user's personal room
  socket.join(`property_user_${userId}`);

  // Auto-join rooms for all hotels user has access to
  hotelRoles.forEach((hotelRole) => {
    const hotelRoom = `hotel_${hotelRole.hotelId}`;
    socket.join(hotelRoom);
    logger.info(`Auto-joined hotel room: ${hotelRoom}`, { userId });
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to property namespace',
    user: {
      id: userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      roles: userRoles,
    },
    hotels: hotelRoles.map((hotelRole) => ({
      hotelId: hotelRole.hotelId,
      role: hotelRole.role,
      isPrimaryOwner: hotelRole.isPrimaryOwner,
    })),
    features: [
      'booking_notifications',
      'inventory_updates',
      'review_alerts',
      'analytics_realtime',
      'staff_management',
    ],
  });

  const context = { namespace, socket, userId, userRoles, hotelRoles };

  registerSetActiveHotel(context);
  registerSubscribeBookings(context);
  registerUpdateBookingStatus(context);
  registerUpdateInventory(context);
  registerSubscribeAnalytics(context);
  registerGetOnlineStaff(context);
  registerBroadcastToHotel(context);
  registerDisconnect(context);
  registerError(context);
}

module.exports = { handleConnection };
