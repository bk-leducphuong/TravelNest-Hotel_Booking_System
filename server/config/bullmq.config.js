require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
});

const connectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
  db: parseInt(process.env.REDIS_DATABASE || '1', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const defaultJobOptions = {
  attempts: parseInt(process.env.BULLMQ_MAX_RETRY_ATTEMPTS || '5', 10),
  backoff: {
    type: 'exponential',
    delay: parseInt(process.env.BULLMQ_RETRY_DELAY_MS || '60000', 10),
  },
  removeOnComplete: {
    age: 86400,
    count: 1000,
  },
  removeOnFail: {
    age: 604800,
  },
};

const workerOptions = {
  connection: connectionOptions,
  autorun: false,
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 1000,
  },
};

module.exports = {
  connection: connectionOptions,
  defaultJobOptions,
  workerOptions,
  queues: {
    imageProcessing: {
      name: 'imageProcessing',
      options: defaultJobOptions,
      workerOptions: {
        ...workerOptions,
        concurrency: parseInt(process.env.BULLMQ_IMAGE_CONCURRENCY || '2', 10),
      },
    },
    hotelSnapshot: {
      name: 'hotelSnapshot',
      options: defaultJobOptions,
      workerOptions: {
        ...workerOptions,
        concurrency: parseInt(process.env.BULLMQ_HOTEL_CONCURRENCY || '10', 10),
      },
    },
  },
};
