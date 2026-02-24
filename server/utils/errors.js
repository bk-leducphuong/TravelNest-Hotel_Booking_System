const ApiError = require('./ApiError');

exports.BadRequest = (msg, details) => new ApiError(400, 'BAD_REQUEST', msg, details);

exports.Unauthorized = (msg = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', msg);

exports.Forbidden = (msg = 'Forbidden') => new ApiError(403, 'FORBIDDEN', msg);

exports.NotFound = (msg = 'Resource not found') => new ApiError(404, 'NOT_FOUND', msg);

exports.Conflict = (msg, details) => new ApiError(409, 'CONFLICT', msg, details);

exports.Internal = (msg = 'Internal server error') => new ApiError(500, 'INTERNAL_ERROR', msg);
