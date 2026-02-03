const { getProducer } = require('../kafka/producerPool');
const { topicFor } = require('@kafka/topics');
const logger = require('@config/logger.config');

const TOPIC = topicFor('hotelSearchSnapshot');

/**
 * Emit hotel.created event
 */
const emitHotelCreated = async (hotelId, hotelData) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
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
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted hotel.created for hotel ${hotelId}`);
};

/**
 * Emit hotel.updated event
 */
const emitHotelUpdated = async (hotelId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'hotel.updated',
          hotelId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted hotel.updated for hotel ${hotelId}`);
};

/**
 * Emit room_inventory.changed event
 */
const emitRoomInventoryChanged = async (hotelId, roomId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'room_inventory.changed',
          hotelId,
          roomId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted room_inventory.changed for hotel ${hotelId}`);
};

/**
 * Emit review.created event
 */
const emitReviewCreated = async (hotelId, reviewId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'review.created',
          hotelId,
          reviewId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted review.created for hotel ${hotelId}`);
};

/**
 * Emit amenity.changed event
 */
const emitAmenityChanged = async (hotelId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'amenity.changed',
          hotelId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted amenity.changed for hotel ${hotelId}`);
};

/**
 * Emit booking.completed event
 */
const emitBookingCompleted = async (hotelId, bookingId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'booking.completed',
          hotelId,
          bookingId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  logger.info(`[Event] Emitted booking.completed for hotel ${hotelId}`);
};

/**
 * Emit hotel.viewed event
 */
const emitHotelViewed = async (hotelId, userId = null) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'hotel.viewed',
          hotelId,
          userId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  // Note: Don't log this to avoid spam, as views can be frequent
};

/**
 * Emit snapshot.full_refresh event
 */
const emitFullRefresh = async (hotelId) => {
  const producer = getProducer('default');

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: hotelId,
        value: JSON.stringify({
          eventType: 'snapshot.full_refresh',
          hotelId,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
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
