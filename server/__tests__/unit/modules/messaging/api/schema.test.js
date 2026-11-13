const guestSchema = require('@modules/messaging/api/guest.schema');
const adminSchema = require('@modules/messaging/api/admin.schema');

/**
 * Body emptiness and length are service-level concerns so the API can return
 * MESSAGE_EMPTY / MESSAGE_TOO_LONG. The Joi layer must not pre-empt those codes.
 */
describe.each([
  ['guest', guestSchema],
  ['admin', adminSchema],
])('%s send-message schema', (_side, schema) => {
  it('lets a blank body through to the service validator', () => {
    const { error } = schema.sendMessage.body.validate({ body: '   ' });
    expect(error).toBeUndefined();
  });

  it('lets an over-length body through to the service validator', () => {
    const { error } = schema.sendMessage.body.validate({ body: 'x'.repeat(4001) });
    expect(error).toBeUndefined();
  });

  it('still rejects a non-string body', () => {
    const { error } = schema.sendMessage.body.validate({ body: 123 });
    expect(error).toBeDefined();
  });
});
