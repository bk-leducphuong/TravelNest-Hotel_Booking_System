require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const bcrypt = require('bcryptjs');

const db = require('../../models');
const sequelize = require('../../config/database.config');
const { KeycloakAdminClient } = require('../../scripts/keycloak/lib/keycloak-admin');

/**
 * Admin / hotel owner / manager / staff seeder.
 *
 * Creates deterministic, known-credential accounts so you do not have to create
 * mock admin data by hand:
 *
 *   admin@travelnest.local    platform admin        (global role: admin)
 *   support@travelnest.local  support agent          (global role: support_agent)
 *   owner@travelnest.local    hotel owner            (hotel role: owner)
 *   manager@travelnest.local  hotel manager          (hotel role: manager)
 *   staff@travelnest.local    hotel staff            (hotel role: staff)
 *
 * It also writes the `hotel_users` memberships and sets `hotels.owner_id`, and
 * (when Keycloak admin credentials are configured) provisions the matching
 * Keycloak accounts with the password + realm roles, binding
 * `users.keycloak_user_id` so they can log in immediately.
 *
 * Idempotent: re-running updates existing rows instead of duplicating.
 */

const {
  users: Users,
  roles: Roles,
  user_roles: UserRoles,
  auth_accounts: AuthAccounts,
  hotels: Hotels,
  hotel_users: HotelUsers,
} = db;

const DEFAULT_PASSWORD = process.env.SEED_TEST_PASSWORD || 'Test@1234';

const ACCOUNTS = [
  {
    key: 'admin',
    email: 'admin@travelnest.local',
    firstName: 'Platform',
    lastName: 'Admin',
    globalRole: 'admin',
    realmRoles: ['admin'],
    hotelRole: null,
  },
  {
    key: 'support',
    email: 'support@travelnest.local',
    firstName: 'Support',
    lastName: 'Agent',
    globalRole: 'support_agent',
    realmRoles: ['support_agent'],
    hotelRole: null,
  },
  {
    key: 'owner',
    email: 'owner@travelnest.local',
    firstName: 'Hotel',
    lastName: 'Owner',
    globalRole: 'user',
    realmRoles: ['user'],
    hotelRole: 'owner',
    primaryOwner: true,
  },
  {
    key: 'manager',
    email: 'manager@travelnest.local',
    firstName: 'Hotel',
    lastName: 'Manager',
    globalRole: 'user',
    realmRoles: ['user'],
    hotelRole: 'manager',
  },
  {
    key: 'staff',
    email: 'staff@travelnest.local',
    firstName: 'Hotel',
    lastName: 'Staff',
    globalRole: 'user',
    realmRoles: ['user'],
    hotelRole: 'staff',
  },
];

const ROLE_NAMES = ['guest', 'user', 'admin', 'support_agent', 'owner', 'manager', 'staff'];

async function ensureRolesExist() {
  const roleMap = {};

  for (const name of ROLE_NAMES) {
    const [role] = await Roles.findOrCreate({
      where: { name },
      defaults: { name, description: `Seeded role: ${name}` },
    });
    roleMap[name] = role.id;
  }

  return roleMap;
}

async function resolveHotel(hotelId) {
  if (hotelId) {
    const hotel = await Hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel not found: ${hotelId}`);
    }
    return hotel;
  }

  const hotel = await Hotels.findOne({ order: [['created_at', 'ASC']] });
  if (!hotel) {
    throw new Error(
      'No hotels found. Run the hotel seeder first (seed:hotel / seed:all) or pass { hotelId }.'
    );
  }
  return hotel;
}

async function upsertLocalUser(account, password) {
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await Users.findOrCreate({
    where: { email: account.email },
    defaults: {
      email: account.email,
      first_name: account.firstName,
      last_name: account.lastName,
      status: 'active',
      email_verified_at: new Date(),
    },
  });

  await user.update({
    first_name: account.firstName,
    last_name: account.lastName,
    status: 'active',
    email_verified_at: user.email_verified_at || new Date(),
  });

  const [authAccount] = await AuthAccounts.findOrCreate({
    where: { user_id: user.id, provider: 'local' },
    defaults: {
      user_id: user.id,
      provider: 'local',
      provider_user_id: account.email,
      password_hash: passwordHash,
    },
  });
  await authAccount.update({ provider_user_id: account.email, password_hash: passwordHash });

  return user;
}

async function assignGlobalRole(userId, roleId) {
  await UserRoles.findOrCreate({
    where: { user_id: userId, role_id: roleId },
    defaults: { user_id: userId, role_id: roleId },
  });
}

async function upsertMembership(hotelId, userId, roleId, isPrimaryOwner = false) {
  const [membership] = await HotelUsers.findOrCreate({
    where: { hotel_id: hotelId, user_id: userId },
    defaults: {
      hotel_id: hotelId,
      user_id: userId,
      role_id: roleId,
      is_primary_owner: isPrimaryOwner,
    },
  });

  if (membership.role_id !== roleId || membership.is_primary_owner !== isPrimaryOwner) {
    await membership.update({ role_id: roleId, is_primary_owner: isPrimaryOwner });
  }

  return membership;
}

function buildKeycloakConfig() {
  const baseUrl = process.env.KEYCLOAK_BASE_URL;
  const realm = process.env.KEYCLOAK_REALM;

  if (!baseUrl || !realm) {
    return null;
  }

  const adminClientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || null;
  const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME || null;
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || null;

  if (!adminClientSecret && !(adminUsername && adminPassword)) {
    return null;
  }

  return {
    baseUrl,
    realm,
    adminRealm: process.env.KEYCLOAK_ADMIN_REALM || 'master',
    adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
    adminClientSecret,
    adminUsername,
    adminPassword,
  };
}

async function provisionKeycloakUser(client, config, account, password) {
  const existing = (await client.findUsersByEmail(account.email)).find(
    (item) => (item.email || '').toLowerCase() === account.email.toLowerCase()
  );

  let kcUser = existing;

  if (!kcUser) {
    kcUser = await client.createUser({
      username: account.email,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      enabled: true,
      emailVerified: true,
      requiredActions: [],
      credentials: [{ type: 'password', value: password, temporary: false }],
    });
  } else {
    await client.request({
      method: 'put',
      url: `/admin/realms/${encodeURIComponent(config.realm)}/users/${encodeURIComponent(kcUser.id)}`,
      data: {
        ...kcUser,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        enabled: true,
        emailVerified: true,
        requiredActions: [],
      },
    });
    await client.request({
      method: 'put',
      url: `/admin/realms/${encodeURIComponent(config.realm)}/users/${encodeURIComponent(kcUser.id)}/reset-password`,
      data: { type: 'password', value: password, temporary: false },
    });
  }

  const currentRoles = new Set(await client.getUserRealmRoleNames(kcUser.id));
  const rolesToAdd = [];
  for (const roleName of account.realmRoles) {
    if (currentRoles.has(roleName)) {
      continue;
    }
    const role = await client.getRealmRole(roleName);
    if (role) {
      rolesToAdd.push(role);
    }
  }
  await client.addRealmRolesToUser(kcUser.id, rolesToAdd);

  return kcUser;
}

/**
 * @param {Object} options
 * @param {string} [options.hotelId]       Target hotel (defaults to the oldest hotel).
 * @param {string} [options.password]      Shared password for the seeded accounts.
 * @param {boolean} [options.syncKeycloak] Provision matching Keycloak users (default true when configured).
 */
async function seedHotelStaff(options = {}) {
  const { hotelId, password = DEFAULT_PASSWORD, syncKeycloak = true } = options;

  console.log('🌱 Starting admin / hotel staff seeding...');

  const roleMap = await ensureRolesExist();
  const hotel = await resolveHotel(hotelId);
  console.log(`🏨 Target hotel: ${hotel.name} (${hotel.id})`);

  const kcConfig = syncKeycloak ? buildKeycloakConfig() : null;
  const kcClient = kcConfig ? new KeycloakAdminClient(kcConfig) : null;

  if (syncKeycloak && !kcClient) {
    console.warn(
      '⚠️  Keycloak admin credentials not configured; seeding local DB only (no Keycloak logins).'
    );
  }

  const summary = [];

  for (const account of ACCOUNTS) {
    const user = await upsertLocalUser(account, password);
    await assignGlobalRole(user.id, roleMap[account.globalRole]);

    let membership = null;
    if (account.hotelRole) {
      if (account.primaryOwner) {
        // At most one primary owner per hotel: transfer rather than duplicate.
        await HotelUsers.update({ is_primary_owner: false }, { where: { hotel_id: hotel.id } });
      }
      membership = await upsertMembership(
        hotel.id,
        user.id,
        roleMap[account.hotelRole],
        Boolean(account.primaryOwner)
      );
      if (account.primaryOwner) {
        await hotel.update({ owner_id: user.id });
      }
    }

    let keycloakBound = false;
    if (kcClient) {
      try {
        const kcUser = await provisionKeycloakUser(kcClient, kcConfig, account, password);
        await user.update({ keycloak_user_id: kcUser.id });
        keycloakBound = true;
      } catch (error) {
        console.error(`   ✗ Keycloak provisioning failed for ${account.email}: ${error.message}`);
      }
    }

    summary.push({
      email: account.email,
      globalRole: account.globalRole,
      hotelRole: account.hotelRole || null,
      membershipId: membership ? membership.id : null,
      keycloakBound,
    });

    console.log(
      `   ✓ ${account.email} (global=${account.globalRole}${
        account.hotelRole ? `, hotel=${account.hotelRole}` : ''
      }${keycloakBound ? ', keycloak=ok' : ''})`
    );
  }

  console.log('\n📊 Admin/Staff Summary:');
  console.table(summary);
  console.log(`\n🔑 Shared password: ${password}`);
  console.log('🎉 Admin / hotel staff seeding complete.');

  return summary;
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedHotelStaff({
        hotelId: process.env.SEED_HOTEL_ID || undefined,
        password: process.env.SEED_TEST_PASSWORD || DEFAULT_PASSWORD,
        syncKeycloak: process.env.SEED_SKIP_KEYCLOAK !== 'true',
      });

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
  seedHotelStaff,
  ACCOUNTS,
  DEFAULT_PASSWORD,
};
