/**
 * Pure row generator for the `hotel_policies` table.
 *
 * Each hotel always gets the essential policy types plus a random subset of
 * optional ones, mirroring the legacy `hotel_policy.seed.js` data.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'hotel_policies';

const COLUMNS = [
  'id',
  'hotel_id',
  'policy_type',
  'title',
  'description',
  'icon',
  'is_active',
  'display_order',
  'created_at',
  'updated_at',
];

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

const ESSENTIAL_TYPES = ['cancellation', 'children', 'pets', 'payment', 'smoking'];
// Derive from the templates so every selected type is guaranteed to have one.
const OPTIONAL_TYPES = Object.keys(POLICY_TEMPLATES).filter(
  (type) => !ESSENTIAL_TYPES.includes(type)
);

function buildRow(faker, hotelId, policyType, displayOrder, createdAt) {
  const template = faker.helpers.arrayElement(POLICY_TEMPLATES[policyType]);

  return {
    id: uuidv7(),
    hotel_id: hotelId,
    policy_type: policyType,
    title: template.title,
    description: template.description,
    icon: template.icon,
    is_active: true,
    display_order: displayOrder,
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

async function* createRows({ faker, hotelIds }) {
  for await (const hotelId of hotelIds) {
    const createdAt = faker.date.past({ years: 1 });
    let displayOrder = 0;

    for (const policyType of ESSENTIAL_TYPES) {
      yield buildRow(faker, hotelId, policyType, displayOrder, createdAt);
      displayOrder += 1;
    }

    const optionalCount = faker.number.int({ min: 2, max: 5 });
    const selected = faker.helpers.arrayElements(OPTIONAL_TYPES, optionalCount);
    for (const policyType of selected) {
      yield buildRow(faker, hotelId, policyType, displayOrder, createdAt);
      displayOrder += 1;
    }
  }
}

module.exports = {
  COLUMNS,
  ESSENTIAL_TYPES,
  OPTIONAL_TYPES,
  POLICY_TEMPLATES,
  TABLE,
  buildRow,
  createRows,
};
