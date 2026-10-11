const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');

/**
 * Translate known non-ApiError throwables into ApiErrors so that client errors
 * (bad input, invalid file, constraint violations) return a proper 4xx instead
 * of an opaque 500.
 */
function mapKnownError(err) {
  if (!err) {
    return new ApiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }

  // Sequelize model-level validation (e.g. `isIn` on timezone) -> 400.
  if (err.name === 'SequelizeValidationError' && Array.isArray(err.errors)) {
    const fields = {};
    err.errors.forEach((e) => {
      fields[e.path || '_form'] = e.message;
    });
    return new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', fields);
  }

  // Unique-constraint races -> 409.
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = {};
    (err.errors || []).forEach((e) => {
      fields[e.path || '_form'] = e.message;
    });
    return new ApiError(409, 'CONFLICT', 'Resource already exists', fields);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new ApiError(409, 'CONFLICT', 'Related resource constraint violated');
  }

  // Multer file-upload errors (size/limit) -> 400.
  if (
    err.name === 'MulterError' ||
    (typeof err.code === 'string' && err.code.startsWith('LIMIT_'))
  ) {
    return new ApiError(400, 'INVALID_FILE_UPLOAD', err.message || 'Invalid file upload');
  }

  // Multer's fileFilter rejects non-images with a plain Error.
  if (err.message === 'Not an image! Please upload an image.') {
    return new ApiError(400, 'INVALID_FILE_TYPE', err.message);
  }

  // Anything else is an unexpected server error.
  return new ApiError(500, 'INTERNAL_ERROR', 'Internal server error');
}

module.exports = (err, req, res, next) => {
  let apiError = err;

  // Treat as API error if it has statusCode and code (handles cross-module ApiError)
  const isApiError =
    err instanceof ApiError || (err && typeof err.statusCode === 'number' && err.code);

  if (!isApiError) {
    apiError = mapKnownError(err);
  }

  // Create request-specific logger
  const requestLogger = logger.withRequest(req);

  // Log error with structured data for ELK
  requestLogger.error(
    {
      // Error details
      errorCode: apiError.code,
      errorMessage: apiError.message,
      statusCode: apiError.statusCode,
      stack: err.stack,

      // Request details
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      params: req.params,

      // Additional context
      isOperational: apiError.isOperational || false,
      details: apiError.details,

      // User context
      userId: req.user?.id,
      authSubject: req.auth?.subject,

      // Client info
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    },
    `Error: ${err.message}`
  );

  // Format error response per RESTful standards
  const errorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message,
    },
  };

  // Add fields if it's a validation error (details contains field-level errors)
  if (apiError.details && Object.keys(apiError.details).length > 0) {
    errorResponse.error.fields = apiError.details;
  }

  res.status(apiError.statusCode).json(errorResponse);
};
