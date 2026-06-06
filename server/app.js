/** ********************* External Libraries ************************ */
require('./register-aliases');

const http = require('http');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

/** ********************* Config ************************ */
const logger = require('@config/logger.config');
const db = require('@models');
const mongoDb = require('@config/mongodb.config');
const { initSocket } = require('@socket/index');
const { startHoldExpirySubscriber } = require('@events/holdExpiry.subscriber');
const { initBucket } = require('@config/minio.config');
const { setupSwagger } = require('@config/swagger.config');
const passport = require('@config/passport.config');
const natsPublisher = require('@events/nats.publisher');

/** ********************* Middlewares ************************ */
const errorMiddleware = require('@middlewares/error.middleware.js');
const limiter = require('@middlewares/rate-limitter.middleware');
const sessionMiddleware = require('@middlewares/session.middleware');
const requestLogger = require('@middlewares/request-logger.middleware');

/** ********************* Routes ************************ */
const v1Routes = require('@routes/v1/index.js');
const healthRoutes = require('@routes/health.routes.js');

/*********************** Init Server ************************/
const createApp = async () => {
  // Connect and sync database
  await db.sequelize.authenticate();
  // await db.sequelize.sync({ alter: false, force: false });

  require('@models/index.js');
  logger.info('Database connected successfully');

  await mongoDb.connect();
  logger.info('MongoDB connected successfully');

  await natsPublisher.connect();

  const app = express();

  // Initialize s3 bucket
  await initBucket();

  // Allow nginx proxy'
  // app.set("trust proxy", 1);

  // Socket io
  const server = http.createServer(app);
  initSocket(server);
  await startHoldExpirySubscriber();
  app.set('httpServer', server);

  const normalizeOrigin = (origin) => origin && origin.replace(/\/$/, '');
  const allowedOrigins = [
    process.env.CLIENT_HOST,
    process.env.ADMIN_CLIENT_HOST,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  app.use(express.static('public'));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key'],
      credentials: true,
    })
  );

  // Webhook routes - MUST come before bodyParser.json() for raw body access
  // Webhooks need raw body for signature verification
  const webhookRoutes = require('@routes/v1/webhook.routes.js');
  app.use('/api/v1/webhooks', bodyParser.raw({ type: 'application/json' }), webhookRoutes);

  // Regular JSON parsing for all other routes
  app.use(bodyParser.json({ limit: '50mb' })); // create application/json parser
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: false })); // create application/x-www-form-urlencoded parser

  // Request logging middleware (before other middlewares to capture all requests)
  app.use(requestLogger);

  app.use(cookieParser());

  // Configure Session
  app.use(sessionMiddleware);

  // Initialize passport (OAuth strategies)
  app.use(passport.initialize());
  app.use(passport.session());

  // Rate limiter
  // app.use(limiter);

  // Swagger API documentation (before routes)
  setupSwagger(app);

  // Bull Board Dashboard for BullMQ monitoring
  const { createBullBoard } = require('@bull-board/api');
  const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
  const { ExpressAdapter } = require('@bull-board/express');
  const {
    imageProcessingQueue,
    hotelSnapshotQueue,
    emailQueue,
    notificationQueue,
    holdExpiryQueue,
  } = require('@queues/index');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(imageProcessingQueue),
      new BullMQAdapter(hotelSnapshotQueue),
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(notificationQueue),
      new BullMQAdapter(holdExpiryQueue),
    ],
    serverAdapter,
  });

  // TODO: Add authentication middleware for production
  // app.use('/admin/queues', authMiddleware.requireAdmin, serverAdapter.getRouter());
  app.use('/admin/queues', serverAdapter.getRouter());

  logger.info('Bull Board dashboard available at /admin/queues');

  // Health check routes (root-level)
  app.use('/health', healthRoutes);

  // API v1 routes
  app.use('/api/v1', v1Routes);

  const { csrfErrorHandler } = require('@middlewares/csrf.middleware');

  app.use(csrfErrorHandler);
  app.use(errorMiddleware);

  // Default route
  app.get('/', (req, res) => {
    res.send('Welcome to the Hotel Booking API');
  });

  return app;
};

module.exports = createApp;
