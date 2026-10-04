const imageService = require('./application/image.service');
const mediaProxyService = require('./infrastructure/media-proxy.client');
const imageRoutes = require('./api/image.routes');

/**
 * Media module - public interface.
 *
 * Owns image upload/read/proxy for Node (the underlying media store is the Go
 * media service, reached over HTTP). Tables: images, image_variants (read).
 *
 * `mediaProxy` is used by identity (avatar) and the join/onboarding service.
 */
module.exports = {
  // HTTP edge (mounted by routes/v1/index.js).
  imageRoutes,

  // Image use-cases (image.service.js).
  image: imageService,

  // Media service HTTP client (media-proxy.client.js).
  mediaProxy: mediaProxyService,
};
