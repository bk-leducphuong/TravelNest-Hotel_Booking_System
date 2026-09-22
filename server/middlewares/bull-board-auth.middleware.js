const nodeCrypto = require('crypto');

/**
 * Guards the Bull Board queue dashboard.
 *
 * It is disabled unless explicitly enabled, and when enabled it requires HTTP
 * Basic credentials. This dashboard exposes queue internals and job payloads,
 * so it must never be publicly reachable.
 */

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  if (left.length !== right.length) {
    return false;
  }

  return nodeCrypto.timingSafeEqual(left, right);
}

function isEnabled() {
  return process.env.ENABLE_BULL_BOARD === 'true';
}

module.exports = function bullBoardAuth(req, res, next) {
  if (!isEnabled()) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const username = process.env.BULL_BOARD_USERNAME;
  const password = process.env.BULL_BOARD_PASSWORD;

  if (!username || !password) {
    return res.status(503).json({
      success: false,
      message: 'Bull Board is enabled but BULL_BOARD_USERNAME/BULL_BOARD_PASSWORD are not set.',
    });
  }

  const authorization = req.get('authorization') || '';
  const [scheme, encoded] = authorization.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const providedUser = decoded.slice(0, separatorIndex);
    const providedPass = decoded.slice(separatorIndex + 1);

    if (safeEqual(providedUser, username) && safeEqual(providedPass, password)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="TravelNest Bull Board"');
  return res.status(401).json({ success: false, message: 'Authentication required.' });
};
