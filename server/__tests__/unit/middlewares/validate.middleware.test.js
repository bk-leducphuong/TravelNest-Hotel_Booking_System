const Joi = require('joi');

const validate = require('@middlewares/validate.middleware');

describe('validate.middleware', () => {
  it('surfaces the intended `any.custom` message (not the empty Joi default)', (done) => {
    const schema = {
      query: Joi.object({ x: Joi.string() }).custom((value, helpers) =>
        helpers.error('any.custom', { message: 'CUSTOM MSG' })
      ),
    };

    validate(schema)({ query: {} }, {}, (err) => {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual({ _form: 'CUSTOM MSG' });
      done();
    });
  });

  it('uses a stable `_form` key for object-level errors', (done) => {
    const schema = {
      body: Joi.object({ a: Joi.string() })
        .min(1)
        .messages({ 'object.min': 'At least one field must be provided' }),
    };

    validate(schema)({ body: {} }, {}, (err) => {
      expect(err.details).toEqual({ _form: 'At least one field must be provided' });
      done();
    });
  });

  it('reports field-level errors by path', (done) => {
    const schema = { body: Joi.object({ a: Joi.string().required() }) };

    validate(schema)({ body: {} }, {}, (err) => {
      expect(err.details.a).toBeDefined();
      done();
    });
  });

  it('replaces req.query even though Express 5 exposes it as a getter', () => {
    const schema = {
      query: Joi.object({ limit: Joi.number().integer().default(10) }),
    };

    // Mimic Express 5: `req.query` is a getter that re-parses the URL on every
    // read and has no setter, so assigning to it throws.
    const req = {};
    Object.defineProperty(req, 'query', {
      get: () => ({ limit: '10', unknown: 'stripped' }),
      configurable: true,
      enumerable: true,
    });

    validate(schema)(req, {}, (err) => {
      expect(err).toBeUndefined();
      expect(req.query).toEqual({ limit: 10 });
    });
  });
});
