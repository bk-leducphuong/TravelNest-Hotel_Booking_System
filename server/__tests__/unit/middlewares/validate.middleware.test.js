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
});
