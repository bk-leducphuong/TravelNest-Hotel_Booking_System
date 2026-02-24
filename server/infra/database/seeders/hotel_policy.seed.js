/**
 * Hotel Policy Seed File
 *
 * Generates realistic hotel policy data and seeds the database.
 * Requires existing hotels in the database.
 *
 * Usage:
 *   - Run directly: node seed/hotel_policy.seed.js
 *   - Import and use: const { seedHotelPolicies } = require('./seed/hotel_policy.seed');
 *
 * Options:
 *   - clearExisting: Whether to clear existing policies before seeding (default: false)
 *   - hotelIds: Specific hotel IDs (UUIDs) to seed (optional, seeds all if not provided)
 *
 * Note: This seed file requires hotels to exist in the database first.
 */

require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production',
});
const { faker } = require('@faker-js/faker');

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const { POLICY_TYPES } = require('../../../constants/hotels');
const { hotels, hotel_policies } = db;

// Policy templates by type
const POLICY_TEMPLATES = {
  cancellation: [
    {
      title: 'Free Cancellation',
      description:
        'Free cancellation up to 24 hours before check-in. After that, a cancellation fee equal to one night stay will be charged.',
      icon: 'cancel',
    },
    {
      title: 'Flexible Cancellation Policy',
      description:
        'Cancel up to 48 hours before check-in for a full refund. Cancellations within 48 hours are non-refundable.',
      icon: 'calendar-cancel',
    },
    {
      title: 'Non-Refundable',
      description:
        'This is a non-refundable booking. No refunds will be provided for cancellations or early check-out.',
      icon: 'no-refund',
    },
  ],
  children: [
    {
      title: 'Children Welcome',
      description:
        'Children of all ages are welcome. Extra beds and cribs available upon request for an additional fee.',
      icon: 'child',
    },
    {
      title: 'Family Friendly',
      description:
        'Children stay free when using existing beds. Children under 12 years old stay free. Maximum 2 children per room.',
      icon: 'family',
    },
    {
      title: 'Adults Only',
      description:
        'This property does not accommodate children. Guests must be 18 years or older to book.',
      icon: 'adults-only',
    },
  ],
  pets: [
    {
      title: 'Pets Allowed',
      description:
        'Pets are allowed with prior notice. Additional fee of $25 per pet per night applies. Maximum 2 pets per room.',
      icon: 'pet',
    },
    {
      title: 'Pet Friendly',
      description:
        'We welcome your furry friends! No additional fee for pets under 20 lbs. Please notify us in advance.',
      icon: 'dog',
    },
    {
      title: 'No Pets',
      description: 'Pets are not allowed in this property, with the exception of service animals.',
      icon: 'no-pets',
    },
  ],
  payment: [
    {
      title: 'Payment Policy',
      description:
        'Payment is due at time of booking. We accept all major credit cards, debit cards, and PayPal.',
      icon: 'credit-card',
    },
    {
      title: 'Secure Payment',
      description:
        'Full payment required upon booking. We accept Visa, Mastercard, American Express, and Discover.',
      icon: 'payment',
    },
    {
      title: 'Deposit Required',
      description: 'A deposit of 50% is required at booking. Remaining balance due upon check-in.',
      icon: 'deposit',
    },
  ],
  smoking: [
    {
      title: 'Non-Smoking Property',
      description:
        'This is a completely non-smoking property. Smoking is not permitted in rooms or common areas. Designated outdoor smoking areas available.',
      icon: 'no-smoking',
    },
    {
      title: 'Smoke-Free Rooms',
      description:
        'All rooms are smoke-free. Smoking areas available on designated outdoor terraces. Violation fee of $250 applies.',
      icon: 'smoke-free',
    },
  ],
  damage: [
    {
      title: 'Damage Policy',
      description:
        'Guests are responsible for any damage caused to the room or property during their stay. A damage deposit of $100 will be held and returned after inspection.',
      icon: 'warning',
    },
    {
      title: 'Security Deposit',
      description:
        'A refundable security deposit of $200 is required at check-in. This will be refunded within 7 days after checkout if no damage is found.',
      icon: 'shield',
    },
  ],
  age_restriction: [
    {
      title: 'Minimum Age Requirement',
      description:
        'Guests must be at least 21 years old to check in. Valid government-issued photo ID required.',
      icon: 'id-card',
    },
    {
      title: 'Age Policy',
      description:
        'Minimum check-in age is 18 years. Guests under 18 must be accompanied by a parent or legal guardian.',
      icon: 'age',
    },
  ],
  internet: [
    {
      title: 'Free WiFi',
      description:
        'High-speed WiFi is available throughout the property at no additional charge. Network name and password provided at check-in.',
      icon: 'wifi',
    },
    {
      title: 'Complimentary Internet',
      description:
        'Free wireless internet access in all rooms and common areas. Wired internet available in business center.',
      icon: 'internet',
    },
  ],
  parking: [
    {
      title: 'Free Parking',
      description:
        'Free on-site parking available on a first-come, first-served basis. Valet parking available for $15 per night.',
      icon: 'parking',
    },
    {
      title: 'Parking Available',
      description:
        'Self-parking: $10 per night. Valet parking: $25 per night. Limited spaces available, reservations recommended.',
      icon: 'car',
    },
    {
      title: 'No Parking',
      description:
        'On-site parking is not available. Public parking available nearby at $20 per day.',
      icon: 'no-parking',
    },
  ],
  breakfast: [
    {
      title: 'Breakfast Included',
      description:
        'Continental breakfast included in room rate. Served daily from 6:30 AM to 10:00 AM in the dining area.',
      icon: 'breakfast',
    },
    {
      title: 'Breakfast Available',
      description:
        'Full American breakfast available for $15 per person. Children under 12 eat free with paying adult.',
      icon: 'food',
    },
  ],
  group_booking: [
    {
      title: 'Group Booking Policy',
      description:
        'For bookings of 5 or more rooms, please contact our group sales department. Special rates and payment terms available.',
      icon: 'group',
    },
  ],
  additional_fees: [
    {
      title: 'Additional Fees',
      description:
        'A resort fee of $25 per night applies to all reservations. This fee covers WiFi, fitness center access, and daily newspaper.',
      icon: 'fees',
    },
    {
      title: 'Hotel Fees',
      description:
        'All rates are subject to applicable taxes and fees. A 15% service charge will be added to room rate.',
      icon: 'money',
    },
  ],
};

/**
 * Generate policies for a hotel
 * @param {string} hotelId - Hotel ID (UUID)
 * @returns {Array} Array of policy objects
 */
function generatePoliciesForHotel(hotelId) {
  const policies = [];
  let displayOrder = 0;

  // Always include essential policies
  const essentialPolicyTypes = ['cancellation', 'children', 'pets', 'payment', 'smoking'];

  essentialPolicyTypes.forEach((policyType) => {
    const templates = POLICY_TEMPLATES[policyType];
    if (templates) {
      const template = faker.helpers.arrayElement(templates);
      policies.push({
        hotel_id: hotelId,
        policy_type: policyType,
        title: template.title,
        description: template.description,
        icon: template.icon,
        is_active: true,
        display_order: displayOrder++,
        created_at: faker.date.past({ years: 1 }),
        updated_at: faker.date.recent({ days: 30 }),
      });
    }
  });

  // Randomly add optional policies
  const optionalPolicyTypes = [
    'damage',
    'age_restriction',
    'internet',
    'parking',
    'breakfast',
    'group_booking',
    'additional_fees',
  ];

  const numOptionalPolicies = faker.number.int({ min: 2, max: 5 });
  const selectedOptional = faker.helpers.arrayElements(optionalPolicyTypes, numOptionalPolicies);

  selectedOptional.forEach((policyType) => {
    const templates = POLICY_TEMPLATES[policyType];
    if (templates) {
      const template = faker.helpers.arrayElement(templates);
      policies.push({
        hotel_id: hotelId,
        policy_type: policyType,
        title: template.title,
        description: template.description,
        icon: template.icon,
        is_active: true,
        display_order: displayOrder++,
        created_at: faker.date.past({ years: 1 }),
        updated_at: faker.date.recent({ days: 30 }),
      });
    }
  });

  return policies;
}

/**
 * Seed hotel policies into the database
 * @param {Object} options - Seeding options
 * @param {boolean} options.clearExisting - Whether to clear existing policies (default: false)
 * @param {Array<string>} options.hotelIds - Specific hotel IDs (UUIDs) to seed (optional)
 */
async function seedHotelPolicies(options = {}) {
  const { clearExisting = false, hotelIds = null } = options;

  try {
    console.log('🌱 Starting hotel policies seeding...');

    // Get hotels
    let hotelQuery = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelQuery = { id: hotelIds };
    }

    const existingHotels = await hotels.findAll({
      where: hotelQuery,
      attributes: ['id'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);

    // Clear existing policies if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing policies...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await hotel_policies.destroy({ where: { hotel_id: hotelIds } });
      } else {
        await hotel_policies.destroy({ where: {}, truncate: true });
      }
      console.log('✅ Existing policies cleared');
    }

    const policiesToCreate = [];

    // Generate policies for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');
      const hotelPolicies = generatePoliciesForHotel(hotelId);
      policiesToCreate.push(...hotelPolicies);

      console.log(`   📋 Generated ${hotelPolicies.length} policies for hotel ${hotelId}`);
    }

    // Bulk create all policies
    if (policiesToCreate.length > 0) {
      console.log(`\n💾 Creating ${policiesToCreate.length} policy/policies in database...`);
      const createdPolicies = await hotel_policies.bulkCreate(policiesToCreate, {
        validate: true,
        returning: true,
      });

      console.log(`✅ ${createdPolicies.length} policy/policies created successfully`);
    }

    // Display summary
    const totalPolicies = await hotel_policies.count();
    const policiesByType = await hotel_policies.findAll({
      attributes: ['policy_type', [sequelize.fn('COUNT', sequelize.col('id')), 'policy_count']],
      group: ['policy_type'],
      raw: true,
    });

    console.log('\n📊 Policy Summary:');
    console.log(`   Total policies: ${totalPolicies}`);
    console.log(`   Hotels with policies: ${existingHotels.length}`);

    if (policiesByType.length > 0) {
      console.log('\n   Policies by type:');
      policiesByType.forEach((item) => {
        console.log(`     ${item.policy_type}: ${item.policy_count}`);
      });
    }
  } catch (error) {
    console.error('❌ Error seeding hotel policies:', error);
    throw error;
  }
}

/**
 * Seed policies for a specific hotel
 * @param {string} hotelId - Hotel ID (UUID)
 * @returns {Promise<Array>} Created policies
 */
async function seedPoliciesForHotel(hotelId) {
  try {
    // Verify hotel exists
    const hotel = await hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    const policiesToCreate = generatePoliciesForHotel(hotelId);

    const createdPolicies = await hotel_policies.bulkCreate(policiesToCreate, {
      validate: true,
      returning: true,
    });

    console.log(`✅ Created ${createdPolicies.length} policies for hotel ${hotelId}`);
    return createdPolicies;
  } catch (error) {
    console.error(`❌ Error seeding policies for hotel ${hotelId}:`, error);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed policies
      await seedHotelPolicies({
        clearExisting: false, // Set to true to clear existing policies
        // hotelIds: ['uuid-1', 'uuid-2'], // Optional: seed only specific hotels
      });

      // Close database connection
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
  seedHotelPolicies,
  seedPoliciesForHotel,
  generatePoliciesForHotel,
};
