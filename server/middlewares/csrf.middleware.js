const { doubleCsrf } = require('csrf-csrf');
const crypto = require('crypto');

const CSRF_SECRET_LENGTH = 32;

function getSessionSecret(req) {
  if (!req.session) {
    throw new Error('Session is required for CSRF protection');
  }

  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex');
  }

  return req.session.csrfSecret;
}

const {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: getSessionSecret,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    (req.body && req.body._csrf) ||
    (req.query && req.query._csrf),
});

function generateCsrfToken(req, res) {
  const csrfToken = generateToken(req, res);

  return res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
}

function csrfErrorHandler(err, req, res, next) {
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.',
    });
  }

  return next(err);
}

module.exports = {
  doubleCsrfProtection,
  generateCsrfToken,
  csrfErrorHandler,
};

