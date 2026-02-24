const ApiError = require('../utils/ApiError');

module.exports = (schema) => (req, res, next) => {
  const validationTargets = ['params', 'query', 'body'];

  for (const key of validationTargets) {
    if (schema[key]) {
      const { error, value } = schema[key].validate(req[key], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        // Format validation errors as fields object per RESTful standards
        const fields = {};
        error.details.forEach((detail) => {
          const fieldPath = detail.path.join('.');
          fields[fieldPath] = detail.message;
        });

        return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', fields));
      }

      // Replace with sanitized data
      req[key] = value;
    }
  }

  next();
};
