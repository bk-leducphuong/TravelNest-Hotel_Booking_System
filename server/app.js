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
const { initSocket } = require('@platform/realtime');
const { initBucket } = require('@config/minio.config');
const { setupSwagger } = require('@config/swagger.config');
const { registerTransport, INBOUND_EVENTS, HOLD_EVENTS } = require('@platform/events');
const natsTransport = require('@events/nats.adapter');
const redisHoldTransport = require('@platform/events/transports/redis-hold');
const { handleRealtimeNotification } = require('@platform/events/consumers/realtimeNotification');
const { handleHoldExpired } = require('@platform/events/consumers/holdExpiry');

/** ********************* Middlewares ************************ */
const errorMiddleware = require('@middlewares/error.middleware.js');
const limiter = require('@middlewares/rate-limitter.middleware');
const requestLogger = require('@middlewares/request-logger.middleware');
const bullBoardAuth = require('@middlewares/bull-board-auth.middleware');

/** ********************* Routes ************************ */
const v1Routes = require('@routes/v1/index.js');
const { healthRoutes } = require('@platform/health');

/*********************** Init Server ************************/
const createApp = async () => {
  // Connect and sync database
  await db.sequelize.authenticate();
  // await db.sequelize.sync({ alter: false, force: false });

  require('@models/index.js');
  logger.info('Database connected successfully');

  registerTransport(natsTransport);
  registerTransport(redisHoldTransport);
  await natsTransport.connect();

  const app = express();

  // Initialize s3 bucket
  await initBucket();

  // Allow nginx proxy'
  // app.set("trust proxy", 1);

  // Socket io
  const server = http.createServer(app);
  initSocket(server);
  app.set('httpServer', server);

  // Inbound events: transport adapters deliver to the socket consumers.
  await natsTransport.subscribe(INBOUND_EVENTS.REALTIME_DISPATCH, handleRealtimeNotification);
  await redisHoldTransport.subscribe(HOLD_EVENTS.HOLD_EXPIRED, handleHoldExpired);

  const normalizeOrigin = (origin) => origin && origin.replace(/\/$/, '');
  const allowedOrigins = [
    process.env.CLIENT_HOST,
    process.env.ADMIN_CLIENT_HOST,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
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
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'Idempotency-Key',
        'X-Hotel-Id',
      ],
      credentials: true,
    })
  );

  // Webhook routes - MUST come before bodyParser.json() for raw body access
  // Webhooks need raw body for signature verification
  const { webhookRoutes } = require('@modules/payment');
  app.use('/api/v1/webhooks', bodyParser.raw({ type: 'application/json' }), webhookRoutes);

  // Regular JSON parsing for all other routes
  app.use(bodyParser.json({ limit: '50mb' })); // create application/json parser
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: false })); // create application/x-www-form-urlencoded parser

  // Request logging middleware (before other middlewares to capture all requests)
  app.use(requestLogger);

  app.use(cookieParser());

  // Rate limiter (respect X-Forwarded-For only when a trusted proxy is configured)
  if (process.env.TRUST_PROXY) {
    const rawTrustProxy = process.env.TRUST_PROXY;
    const parsedTrustProxy = Number(rawTrustProxy);
    app.set(
      'trust proxy',
      rawTrustProxy === 'true'
        ? 1
        : Number.isNaN(parsedTrustProxy)
          ? rawTrustProxy
          : parsedTrustProxy
    );
  }
  app.use(limiter);

  // Swagger API documentation (before routes)
  setupSwagger(app);

  // Bull Board Dashboard for BullMQ monitoring
  const { createBullBoard } = require('@bull-board/api');
  const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
  const { ExpressAdapter } = require('@bull-board/express');
  const { jobs } = require('@modules/booking');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(jobs.holdExpiry.queue)],
    serverAdapter,
  });

  app.use('/admin/queues', bullBoardAuth, serverAdapter.getRouter());

  logger.info(
    process.env.ENABLE_BULL_BOARD === 'true'
      ? 'Bull Board dashboard enabled at /admin/queues (Basic auth required)'
      : 'Bull Board dashboard disabled (set ENABLE_BULL_BOARD=true to enable)'
  );

  // Health check routes (root-level)
  app.use('/health', healthRoutes);

  // API v1 routes
  app.use('/api/v1', v1Routes);
  app.use(errorMiddleware);

  // Default route
  app.get('/', (req, res) => {
    res.send('Welcome to the Hotel Booking API');
  });

  return app;
};

module.exports = createApp;
