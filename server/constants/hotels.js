const HOTEL_STATUSES = ['active', 'inactive', 'suspended'];
const HOTEL_CHECK_IN_POLICIES = [
  'Late check-in available',
  'Early check-in available',
  'No check-in policy',
];
const HOTEL_CHECK_OUT_POLICIES = [
  'Late check-out available',
  'Early check-out available',
  'No check-out policy',
];

const POLICY_TYPES = [
  'cancellation',
  'children',
  'pets',
  'payment',
  'smoking',
  'damage',
  'age_restriction',
  'internet',
  'parking',
  'breakfast',
  'group_booking',
  'additional_fees',
  'other',
];

const PLACE_CATEGORIES = [
  'restaurant',
  'cafe',
  'bar',
  'shopping',
  'attraction',
  'museum',
  'park',
  'beach',
  'airport',
  'train_station',
  'bus_station',
  'hospital',
  'pharmacy',
  'bank',
  'atm',
  'gas_station',
  'parking',
  'gym',
  'spa',
  'entertainment',
  'landmark',
  'religious',
  'school',
  'other',
];

const IANA_TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Europe/Amsterdam',
  'America/Denver',
  'Asia/Dubai',
  'Europe/Madrid',
];

module.exports = {
  HOTEL_STATUSES,
  HOTEL_CHECK_IN_POLICIES,
  HOTEL_CHECK_OUT_POLICIES,
  IANA_TIMEZONES,
  POLICY_TYPES,
  PLACE_CATEGORIES,
};
