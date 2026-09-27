const rateLimit = require('express-rate-limit');

const max = parseInt(process.env.RATE_LIMIT_MAX || '300', 10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.isFinite(max) && max > 0 ? max : 300,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Webhooks are provider-driven and health checks are polled by k8s; neither
  // should be throttled by client-IP limits.
  skip: (req) =>
    req.path.startsWith('/api/v1/webhooks') ||
    req.path === '/health' ||
    req.path.startsWith('/health/'),
  handler: function (req, res) {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    });
  },
});

module.exports = limiter;
