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
        // Format validation errors as a fields object per RESTful standards.
        // - `any.custom` errors carry the intended message in `context.message`
        //   (Joi otherwise renders `"value" failed custom validation because `).
        // - object-level errors (e.g. `object.min`) have an empty path; give them
        //   a stable key (`_form`) instead of an empty one.
        const fields = {};
        error.details.forEach((detail) => {
          const fieldPath = detail.path.join('.') || '_form';
          const message =
            detail.type === 'any.custom' && detail.context?.message
              ? detail.context.message
              : detail.message;
          fields[fieldPath] = message;
        });

        return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', fields));
      }

      // Replace with sanitized data
      req[key] = value;
    }
  }

  next();
};
