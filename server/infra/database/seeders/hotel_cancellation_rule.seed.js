/**
 * Hotel Cancellation Rule Seed File
 *
 * Creates structured cancellation rules used by refund eligibility logic.
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

let faker;
async function loadFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker ?? mod.default ?? mod;
  }
}

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const { hotels, hotel_cancellation_rules } = db;

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

function generateCancellationRuleForHotel(hotelId) {
  const template = faker.helpers.arrayElement(RULE_TEMPLATES);

  return {
    hotel_id: hotelId,
    room_id: null,
    ...template,
    cancellation_fee_type: 'none',
    cancellation_fee_value: null,
    is_active: true,
    created_at: faker.date.past({ years: 1 }),
    updated_at: faker.date.recent({ days: 30 }),
  };
}

async function seedHotelCancellationRules(options = {}) {
  const { clearExisting = false, hotelIds = null } = options;

  try {
    await loadFaker();
    console.log('🌱 Starting hotel cancellation rules seeding...');

    const hotelWhere = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelWhere.id = hotelIds;
    }

    const existingHotels = await hotels.findAll({
      where: hotelWhere,
      attributes: ['id'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return [];
    }

    if (clearExisting) {
      console.log('🗑️  Clearing existing cancellation rules...');
      await hotel_cancellation_rules.destroy({
        where:
          hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0 ? { hotel_id: hotelIds } : {},
      });
    }

    const rulesToCreate = existingHotels.map((hotel) =>
      generateCancellationRuleForHotel(hotel.id || hotel.get?.('id'))
    );

    const createdRules = await hotel_cancellation_rules.bulkCreate(rulesToCreate, {
      validate: true,
      returning: true,
    });

    console.log(`✅ ${createdRules.length} cancellation rule(s) created successfully`);
    return createdRules;
  } catch (error) {
    console.error('❌ Error seeding hotel cancellation rules:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedHotelCancellationRules({
        clearExisting: false,
      });

      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedHotelCancellationRules,
  generateCancellationRuleForHotel,
};
