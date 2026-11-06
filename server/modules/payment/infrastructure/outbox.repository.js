const { payment_outbox: Outbox } = require('@platform/database');

module.exports = {
  async record(eventKey, eventType, payload, options = {}) {
    return Outbox.findOrCreate({
      where: { event_key: eventKey },
      defaults: { event_type: eventType, payload },
      ...options,
    });
  },
  pending(limit = 100) {
    return Outbox.findAll({ where: { delivered_at: null }, order: [['created_at', 'ASC']], limit });
  },
  delivered(id) {
    return Outbox.update({ delivered_at: new Date() }, { where: { id } });
  },
};
