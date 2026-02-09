const ROLES = {
  // Global roles
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin',
  SUPPORT_AGENT: 'support_agent',
  // Hotel-specific roles
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
};

const VALID_ROLES = Object.values(ROLES);

const HOTEL_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
};

function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

function isValidHotelRole(role) {
  return Object.values(HOTEL_ROLES).includes(role);
}

module.exports = {
  ROLES,
  VALID_ROLES,
  HOTEL_ROLES,
  isValidRole,
  isValidHotelRole,
};
