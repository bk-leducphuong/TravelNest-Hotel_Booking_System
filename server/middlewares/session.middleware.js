const session = require('express-session');
const RedisStore = require('connect-redis').default;

const redisClient = require('../config/redis.config');

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET_KEY, // A secret key to sign the session ID
  resave: false, // Prevents session being saved back to the session store if nothing changed
  saveUninitialized: false, // Prevents uninitialized sessions (without changes) from being saved
  cookie: {
    maxAge: 1000 * 60 * 60 * 365 * 24, // one year session expiration
    httpOnly: true, // Protects against XSS attacks
    secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
  },
});

module.exports = sessionMiddleware;
