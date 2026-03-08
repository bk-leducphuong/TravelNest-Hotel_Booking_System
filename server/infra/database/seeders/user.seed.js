require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
const bcrypt = require('bcryptjs');

let faker;
async function loadFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker ?? mod.default ?? mod;
  }
}

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const { users: Users, roles: Roles, user_roles: UserRoles, auth_accounts: AuthAccounts } = db;

/**
 * Ensure roles exist in the database
 * Only creates roles that are needed for seeding
 * Based on constants/roles.js comments:
 * - 'user': Logged in (regular users with accounts)
 * - 'manager': Hotel manager (hotel-specific role)
 * - 'staff': Hotel staff (hotel-specific role)
 * Note: 'guest' is for users NOT logged in, so we don't seed those
 * @returns {Promise<Object>} Map of role names to role IDs
 */
async function ensureRolesExist() {
  // Only ensure roles we need for seeding
  const roleNames = ['guest', 'admin', 'support_agent', 'user', 'manager', 'staff'];

  const roleMap = {};

  for (const roleName of roleNames) {
    let role = await Roles.findOne({ where: { name: roleName } });
    if (!role) {
      const descriptions = {
        guest: 'Not logged in user account',
        admin: 'Platform admin',
        support_agent: 'Support agent',
        user: 'Logged in user account',
        manager: 'Hotel manager',
        staff: 'Hotel staff',
      };
      role = await Roles.create({
        name: roleName,
        description: descriptions[roleName] || `Role: ${roleName}`,
      });
      console.log(`✅ Created role: ${roleName}`);
    }
    roleMap[roleName] = role.id;
  }

  return roleMap;
}

/**
 * Generate fake user and auth account data
 * @param {Object} options - Options for generating user data
 * @param {string} options.roleName - User role: 'guest', 'hotel_manager', 'admin', etc.
 * @param {number} options.count - Number of users to generate
 * @returns {Promise<Array>} Array of { userData, authAccountData, roleName }
 */
async function generateUsers(options = {}) {
  const { roleName = 'guest', count = 10 } = options;
  const userDataArray = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({
      firstName,
      lastName,
      provider: faker.internet.domainName(),
    });

    // Generate a random password and hash it (used for local auth account)
    const password = faker.internet.password({ length: 12 });
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique connect_account_id for hotel managers
    const connectAccountId =
      roleName === 'hotel_manager' ? `acct_${faker.string.alphanumeric(16)}` : null;

    // Generate phone number in E.164 format
    const countryCode = faker.helpers.arrayElement(['1', '44', '33', '49', '81']);
    const phoneNumber = `+${countryCode}${faker.string.numeric(10, { allowLeadingZeros: false })}`;

    // Core user profile data (no password fields stored on users table)
    const userData = {
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      address: faker.location.streetAddress({ useFullAddress: true }),
      country: faker.location.country(),
      status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']), // Mostly active
      date_of_birth: faker.date
        .birthdate({ min: 18, max: 80, mode: 'age' })
        .toISOString()
        .split('T')[0], // Format: YYYY-MM-DD
      gender: faker.helpers.arrayElement([
        'male',
        'female',
        'non_binary',
        'other',
        'prefer_not_to_say',
      ]),
      nationality: faker.location.country(),
      connect_account_id: connectAccountId,
      email_verified_at: faker.datatype.boolean({ probability: 0.7 })
        ? faker.date.past({ years: 1 })
        : null,
      phone_verified_at: faker.datatype.boolean({ probability: 0.5 })
        ? faker.date.past({ years: 1 })
        : null,
      terms_accepted_at: faker.date.past({ years: 1 }),
    };

    // Local auth account linked to this user
    const authAccountData = {
      provider: 'local',
      provider_user_id: email.toLowerCase(),
      password_hash: passwordHash,
    };

    userDataArray.push({ userData, authAccountData, roleName });
  }

  return userDataArray;
}

/**
 * Assign role to user
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} Created user role
 */
async function assignRoleToUser(userId, roleId) {
  try {
    const [userRole, created] = await UserRoles.findOrCreate({
      where: {
        user_id: userId,
        role_id: roleId,
      },
      defaults: {
        user_id: userId,
        role_id: roleId,
      },
    });
    return userRole;
  } catch (error) {
    // Ignore duplicate key errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    throw error;
  }
}

/**
 * Seed users into the database
 * @param {Object} options - Seeding options
 * @param {number} options.userCount - Number of regular users (logged in accounts) to seed (default: 50)
 * @param {number} options.managerCount - Number of hotel managers to seed (default: 10)
 * @param {number} options.staffCount - Number of hotel staff to seed (default: 20)
 * @param {boolean} options.clearExisting - Whether to clear existing users (default: false)
 */
async function seedUsers(options = {}) {
  await loadFaker();
  const { userCount = 50, managerCount = 10, staffCount = 20, clearExisting = false } = options;

  try {
    console.log('🌱 Starting user seeding...');

    // Ensure roles exist
    console.log('🔍 Ensuring roles exist...');
    const roleMap = await ensureRolesExist();
    console.log('✅ Roles ready');

    // Clear existing users if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing users and user roles...');
      await UserRoles.destroy({ where: {}, truncate: true });
      await AuthAccounts.destroy({ where: {}, truncate: true });
      await Users.destroy({ where: {}, truncate: true });
      console.log('✅ Existing users cleared');
    }

    // Generate and seed regular users (logged in accounts with 'user' role)
    // Note: 'guest' role is for users who are NOT logged in, so we don't seed those
    console.log(`👥 Generating ${userCount} regular users (logged in accounts)...`);
    const userDataArray = await generateUsers({
      roleName: 'user',
      count: userCount,
    });

    const createdUsers = [];
    for (const { userData, authAccountData, roleName } of userDataArray) {
      try {
        const [user, created] = await Users.findOrCreate({
          where: { email: userData.email },
          defaults: userData,
        });
        if (created) {
          await assignRoleToUser(user.id, roleMap[roleName]);
          await AuthAccounts.create({
            ...authAccountData,
            user_id: user.id,
          });
          createdUsers.push(user);
        }
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') {
          console.error(`Error creating user: ${error.message}`);
        }
      }
    }
    console.log(`✅ ${createdUsers.length} regular users seeded`);

    // Generate and seed hotel managers
    // Note: 'manager' is a hotel-specific role (used in hotel_users table)
    console.log(`🏢 Generating ${managerCount} hotel managers...`);
    const managerDataArray = await generateUsers({
      roleName: 'manager',
      count: managerCount,
    });

    const createdManagers = [];
    for (const { userData, authAccountData, roleName } of managerDataArray) {
      try {
        const [user, created] = await Users.findOrCreate({
          where: { email: userData.email },
          defaults: userData,
        });
        if (created) {
          await assignRoleToUser(user.id, roleMap[roleName]);
          await AuthAccounts.create({
            ...authAccountData,
            user_id: user.id,
          });
          createdManagers.push(user);
        }
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') {
          console.error(`Error creating hotel manager: ${error.message}`);
        }
      }
    }
    console.log(`✅ ${createdManagers.length} hotel managers seeded`);

    // Generate and seed hotel staff
    // Note: 'staff' is a hotel-specific role (used in hotel_users table)
    console.log(`👔 Generating ${staffCount} hotel staff...`);
    const staffDataArray = await generateUsers({
      roleName: 'staff',
      count: staffCount,
    });

    const createdStaff = [];
    for (const { userData, authAccountData, roleName } of staffDataArray) {
      try {
        const [user, created] = await Users.findOrCreate({
          where: { email: userData.email },
          defaults: userData,
        });
        if (created) {
          await assignRoleToUser(user.id, roleMap[roleName]);
          await AuthAccounts.create({
            ...authAccountData,
            user_id: user.id,
          });
          createdStaff.push(user);
        }
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') {
          console.error(`Error creating hotel staff: ${error.message}`);
        }
      }
    }
    console.log(`✅ ${createdStaff.length} hotel staff seeded`);

    const totalSeeded = createdUsers.length + createdManagers.length + createdStaff.length;
    console.log(`🎉 Successfully seeded ${totalSeeded} users!`);

    // Display summary
    const totalUsers = await Users.count();
    const userRoleId = roleMap['user'];
    const managerRoleId = roleMap['manager'];
    const staffRoleId = roleMap['staff'];

    const userCount_db = await UserRoles.count({
      where: { role_id: userRoleId },
    });
    const managerCount_db = await UserRoles.count({
      where: { role_id: managerRoleId },
    });
    const staffCount_db = await UserRoles.count({
      where: { role_id: staffRoleId },
    });

    console.log('\n📊 User Summary:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Regular users (logged in): ${userCount_db}`);
    console.log(`   Hotel Managers: ${managerCount_db}`);
    console.log(`   Hotel Staff: ${staffCount_db}`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

/**
 * Seed a single user (useful for testing)
 * @param {Object} userData - User data to seed
 * @param {string} roleName - Role name to assign (default: 'user' for regular logged-in user)
 * @returns {Promise<Object>} Created user
 */
async function seedSingleUser(userData = {}, roleName = 'user') {
  await loadFaker();
  // Ensure roles exist
  const roleMap = await ensureRolesExist();

  const email = userData.email || faker.internet.email();

  // Always create a local auth account with a known password for seeded users
  const plainPassword = 'password123';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const defaultUser = {
    email,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    phone_number: `+1${faker.string.numeric(10)}`,
    status: 'active',
  };

  const user = { ...defaultUser, ...userData };

  try {
    const [createdUser, created] = await Users.findOrCreate({
      where: { email: user.email },
      defaults: user,
    });

    if (created && roleMap[roleName]) {
      await assignRoleToUser(createdUser.id, roleMap[roleName]);
      await AuthAccounts.create({
        user_id: createdUser.id,
        provider: 'local',
        provider_user_id: createdUser.email,
        password_hash: passwordHash,
      });
    }

    console.log(`✅ User created: ${createdUser.email} with role: ${roleName}`);
    return createdUser;
  } catch (error) {
    console.error('❌ Error creating user:', error);
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

      // Seed users
      await seedUsers({
        userCount: 50, // Regular logged-in users
        managerCount: 10, // Hotel managers
        staffCount: 20, // Hotel staff
        clearExisting: false, // Set to true to clear existing users
      });

      // Close database connection
      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedUsers,
  seedSingleUser,
  generateUsers,
  ensureRolesExist,
  assignRoleToUser,
};
