/**
 * Pure row generator for the `hotel_cancellation_rules` table.
 *
 * One hotel-wide rule per hotel (room_id NULL), mirroring the legacy
 * `hotel_cancellation_rule.seed.js`.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'hotel_cancellation_rules';

const COLUMNS = [
  'id',
  'hotel_id',
  'room_id',
  'is_refundable',
  'free_cancellation_until_hours_before_checkin',
  'refund_percent_before_deadline',
  'refund_percent_after_deadline',
  'cancellation_fee_type',
  'cancellation_fee_value',
  'is_active',
  'created_at',
  'updated_at',
];

const RULE_TEMPLATES = [
  {
    is_refundable: true,
    free_cancellation_until_hours_before_checkin: 24,
    refund_percent_before_deadline: 100,
    refund_percent_after_deadline: 0,
  },
  {
    is_refundable: true,
    free_cancellation_until_hours_before_checkin: 48,
    refund_percent_before_deadline: 100,
    refund_percent_after_deadline: 50,
  },
  {
    is_refundable: false,
    free_cancellation_until_hours_before_checkin: null,
    refund_percent_before_deadline: 0,
    refund_percent_after_deadline: 0,
  },
];

function buildRow(faker, hotelId) {
  const template = faker.helpers.arrayElement(RULE_TEMPLATES);
  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    hotel_id: hotelId,
    room_id: null,
    ...template,
    cancellation_fee_type: 'none',
    cancellation_fee_value: null,
    is_active: true,
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

async function* createRows({ faker, hotelIds }) {
  for await (const hotelId of hotelIds) {
    yield buildRow(faker, hotelId);
  }
}

module.exports = {
  COLUMNS,
  RULE_TEMPLATES,
  TABLE,
  buildRow,
  createRows,
};
