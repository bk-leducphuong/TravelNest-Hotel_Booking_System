require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const snapshotRepo = require('@repositories/hotel_search_snapshot.repository');
const elasticsearchClient = require('@config/elasticsearch.config');

const queueName = config.queues.hotelSnapshot.name;
const workerOptions = config.queues.hotelSnapshot.workerOptions;

const MAX_ELASTICSEARCH_RETRIES = 5;

const syncToElasticsearch = async (hotelId, snapshotData, retryCount = 0) => {
  try {
    await elasticsearchClient.index({
      index: 'hotels',
      id: hotelId,
      document: snapshotData,
    });
    logger.info(`[ES Sync] Successfully synced hotel ${hotelId}`);
    return true;
  } catch (error) {
    logger.error(`[ES Sync] Failed to sync hotel ${hotelId} (attempt ${retryCount + 1})`, {
      error: error.message,
    });

    if (retryCount < MAX_ELASTICSEARCH_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return syncToElasticsearch(hotelId, snapshotData, retryCount + 1);
    }

    logger.error(`[ES Sync] Max retries exceeded for hotel ${hotelId}`);
    return false;
  }
};

const eventHandlers = {
  'hotel.created': async (payload) => {
    const { hotelId, hotelData } = payload;
    const snapshot = await snapshotRepo.createInitialSnapshot(hotelId, hotelData);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'hotel.updated': async (payload) => {
    const { hotelId } = payload;
    const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);
    await snapshotRepo.partialUpdate(hotelId, basicInfo);
    const snapshot = await snapshotRepo.getByHotelId(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'room_inventory.changed': async (payload) => {
    const { hotelId } = payload;
    const pricingData = await snapshotRepo.recomputePricing(hotelId);
    const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);
    await snapshotRepo.partialUpdate(hotelId, {
      ...pricingData,
      is_available: pricingData.has_available_rooms && basicInfo.status === 'active',
    });
    const snapshot = await snapshotRepo.getByHotelId(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'review.created': async (payload) => {
    const { hotelId } = payload;
    const ratingData = await snapshotRepo.recomputeRating(hotelId);
    await snapshotRepo.partialUpdate(hotelId, ratingData);
    const snapshot = await snapshotRepo.getByHotelId(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'amenity.changed': async (payload) => {
    const { hotelId } = payload;
    const amenityData = await snapshotRepo.recomputeAmenities(hotelId);
    await snapshotRepo.partialUpdate(hotelId, amenityData);
    const snapshot = await snapshotRepo.getByHotelId(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'booking.completed': async (payload) => {
    const { hotelId } = payload;
    await snapshotRepo.incrementBookingCount(hotelId);
    const pricingData = await snapshotRepo.recomputePricing(hotelId);
    const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);
    await snapshotRepo.partialUpdate(hotelId, {
      is_available: pricingData.has_available_rooms && basicInfo.status === 'active',
      has_available_rooms: pricingData.has_available_rooms,
    });
    const snapshot = await snapshotRepo.getByHotelId(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },

  'hotel.viewed': async (payload) => {
    const { hotelId } = payload;
    await snapshotRepo.incrementViewCount(hotelId);
    return { success: true, hotelId };
  },

  'snapshot.full_refresh': async (payload) => {
    const { hotelId } = payload;
    const snapshot = await snapshotRepo.fullRefresh(hotelId);
    await syncToElasticsearch(hotelId, snapshot.toJSON());
    return { success: true, hotelId };
  },
};

const processHotelSnapshotJob = async (job) => {
  const { eventType, hotelId } = job.data;

  logger.info(`[Worker] Processing ${eventType} for hotel ${hotelId}`);

  const handler = eventHandlers[eventType];
  if (!handler) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  const result = await handler(job.data);
  logger.info(`Successfully processed ${eventType}`, result);

  return result;
};

const hotelSnapshotWorker = new Worker(queueName, processHotelSnapshotJob, {
  ...workerOptions,
  concurrency: workerOptions.concurrency,
});

hotelSnapshotWorker.on('completed', (job) => {
  logger.info(`Hotel snapshot job completed: ${job.id}`, {
    eventType: job.data.eventType,
    hotelId: job.data.hotelId,
    duration: Date.now() - job.timestamp,
  });
});

hotelSnapshotWorker.on('failed', (job, err) => {
  logger.error(`Hotel snapshot job failed: ${job?.id}`, {
    eventType: job?.data?.eventType,
    hotelId: job?.data?.hotelId,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

hotelSnapshotWorker.on('error', (err) => {
  logger.error('Hotel snapshot worker error:', err);
});

hotelSnapshotWorker.on('active', (job) => {
  logger.info(`Hotel snapshot job started: ${job.id}`, {
    eventType: job.data.eventType,
    hotelId: job.data.hotelId,
  });
});

module.exports = hotelSnapshotWorker;
