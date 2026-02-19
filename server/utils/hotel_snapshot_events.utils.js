const { publishToQueue } = require('@utils/rabbitmq.utils');
const { queueFor } = require('@rabbitmq/queues');
const { hotelSnapshotQueue } = require('@queues/index');
const { addJob } = require('@utils/bullmq.utils');
const logger = require('@config/logger.config');

const QUEUE = queueFor('hotelSearchSnapshot');

/**
 * Emit hotel.created event
 */
const emitHotelCreated = async (hotelId, hotelData) => {
  const payload = {
    eventType: 'hotel.created',
    hotelId,
    hotelData: {
      name: hotelData.name,
      city: hotelData.city,
      country: hotelData.country,
      latitude: hotelData.latitude,
      longitude: hotelData.longitude,
      hotel_class: hotelData.hotel_class,
      status: hotelData.status,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `hotel.created-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted hotel.created for hotel ${hotelId}`);
};

/**
 * Emit hotel.updated event
 */
const emitHotelUpdated = async (hotelId) => {
  const payload = {
    eventType: 'hotel.updated',
    hotelId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `hotel.updated-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted hotel.updated for hotel ${hotelId}`);
};

/**
 * Emit room_inventory.changed event
 */
const emitRoomInventoryChanged = async (hotelId, roomId) => {
  const payload = {
    eventType: 'room_inventory.changed',
    hotelId,
    roomId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `room_inventory.changed-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted room_inventory.changed for hotel ${hotelId}`);
};

/**
 * Emit review.created event
 */
const emitReviewCreated = async (hotelId, reviewId) => {
  const payload = {
    eventType: 'review.created',
    hotelId,
    reviewId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `review.created-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted review.created for hotel ${hotelId}`);
};

/**
 * Emit amenity.changed event
 */
const emitAmenityChanged = async (hotelId) => {
  const payload = {
    eventType: 'amenity.changed',
    hotelId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `amenity.changed-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted amenity.changed for hotel ${hotelId}`);
};

/**
 * Emit booking.completed event
 */
const emitBookingCompleted = async (hotelId, bookingId) => {
  const payload = {
    eventType: 'booking.completed',
    hotelId,
    bookingId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 5, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 5,
    jobId: `booking.completed-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted booking.completed for hotel ${hotelId}`);
};

/**
 * Emit hotel.viewed event
 */
const emitHotelViewed = async (hotelId, userId = null) => {
  const payload = {
    eventType: 'hotel.viewed',
    hotelId,
    userId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 3, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 3,
    jobId: `hotel.viewed-${hotelId}-${Date.now()}`,
  });
};

/**
 * Emit snapshot.full_refresh event
 */
const emitFullRefresh = async (hotelId) => {
  const payload = {
    eventType: 'snapshot.full_refresh',
    hotelId,
    timestamp: new Date().toISOString(),
  };

  try {
    await publishToQueue(QUEUE, payload, 8, hotelId);
  } catch (error) {
    logger.warn('Failed to publish to RabbitMQ (continuing with BullMQ)', {
      error: error.message,
    });
  }

  await addJob(hotelSnapshotQueue, 'hotel-snapshot-event', payload, {
    priority: 8,
    jobId: `snapshot.full_refresh-${hotelId}-${Date.now()}`,
  });

  logger.info(`[Event] Emitted snapshot.full_refresh for hotel ${hotelId}`);
};

module.exports = {
  emitHotelCreated,
  emitHotelUpdated,
  emitRoomInventoryChanged,
  emitReviewCreated,
  emitAmenityChanged,
  emitBookingCompleted,
  emitHotelViewed,
  emitFullRefresh,
};
