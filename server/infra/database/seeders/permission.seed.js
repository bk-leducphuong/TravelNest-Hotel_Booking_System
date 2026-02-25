/**
 * Permission & Role-Permission Seed File
 *
 * Seeds permissions and role_permissions tables.
 * Also ensures all roles exist before assigning permissions.
 *
 * Usage:
 *   - Run directly: node database/seeders/permission.seed.js
 *   - Import and use: const { seedPermissions } = require('./database/seeders/permission.seed');
 *
 * Options:
 *   - clearExisting: Whether to clear existing permissions before seeding (default: false)
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const db = require('../../models');
const sequelize = require('../../config/database.config');
const {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_PERMISSIONS,
} = require('../../constants/permissions');
const { ROLES } = require('../../constants/roles');

const { permissions: Permissions, roles: Roles, role_permissions: RolePermissions } = db;

/**
 * Role descriptions for seeding
 */
const ROLE_DESCRIPTIONS = {
  guest: 'Unauthenticated user with minimal access',
  user: 'Registered user who can book hotels and write reviews',
  staff: 'Hotel staff member who manages day-to-day operations',
  manager: 'Hotel manager with full hotel management capabilities',
  owner: 'Hotel owner with complete control over their properties',
  support_agent: 'Customer support agent who helps users with issues',
  admin: 'System administrator with full platform access',
};

/**
 * Ensure all roles exist in the database
 * @returns {Promise<Object>} Map of role names to role records
 */
async function ensureRolesExist() {
  const roleMap = {};

  for (const roleName of Object.values(ROLES)) {
    const [role] = await Roles.findOrCreate({
      where: { name: roleName },
      defaults: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName] || `Role: ${roleName}`,
      },
    });
    roleMap[roleName] = role;
  }

  console.log(`✅ Ensured ${Object.keys(roleMap).length} roles exist`);
  return roleMap;
}

/**
 * Seed all permissions
 * @param {boolean} clearExisting - Clear existing permissions first
 * @returns {Promise<Object>} Map of permission names to permission records
 */
async function seedPermissionsTable(clearExisting = false) {
  if (clearExisting) {
    console.log('🗑️  Clearing existing role_permissions...');
    await RolePermissions.destroy({ where: {} });
    console.log('🗑️  Clearing existing permissions...');
    await Permissions.destroy({ where: {} });
  }

  const permissionMap = {};
  let created = 0;
  let skipped = 0;

  for (const [key, name] of Object.entries(PERMISSIONS)) {
    const [permission, wasCreated] = await Permissions.findOrCreate({
      where: { name },
      defaults: {
        name,
        description: PERMISSION_DESCRIPTIONS[name] || `Permission: ${name}`,
      },
    });
    permissionMap[name] = permission;
    if (wasCreated) created++;
    else skipped++;
  }

  console.log(`✅ Permissions: ${created} created, ${skipped} already existed`);
  return permissionMap;
}

/**
 * Seed role-permission mappings
 * @param {Object} roleMap - Map of role names to role records
 * @param {Object} permissionMap - Map of permission names to permission records
 * @returns {Promise<{ linked: number, skipped: number }>}
 */
async function seedRolePermissions(roleMap, permissionMap) {
  let linked = 0;
  let skipped = 0;

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleName];
    if (!role) {
      console.log(`⚠️  Role "${roleName}" not found, skipping...`);
      continue;
    }

    for (const permissionName of permissionNames) {
      const permission = permissionMap[permissionName];
      if (!permission) {
        console.log(`⚠️  Permission "${permissionName}" not found, skipping...`);
        continue;
      }

      const [_, wasCreated] = await RolePermissions.findOrCreate({
        where: {
          role_id: role.id,
          permission_id: permission.id,
        },
        defaults: {
          role_id: role.id,
          permission_id: permission.id,
        },
      });

      if (wasCreated) linked++;
      else skipped++;
    }
  }

  console.log(`✅ Role-permissions: ${linked} created, ${skipped} already existed`);
  return { linked, skipped };
}

/**
 * Main seed function
 * @param {Object} options - Seeding options
 * @param {boolean} options.clearExisting - Clear existing data first (default: false)
 */
async function seedPermissions(options = {}) {
  const { clearExisting = false } = options;

  try {
    console.log('🌱 Starting permission seeding...');

    // Step 1: Ensure roles exist
    console.log('\n📋 Step 1: Ensuring roles exist...');
    const roleMap = await ensureRolesExist();

    // Step 2: Seed permissions
    console.log('\n📋 Step 2: Seeding permissions...');
    const permissionMap = await seedPermissionsTable(clearExisting);

    // Step 3: Seed role-permission mappings
    console.log('\n📋 Step 3: Seeding role-permission mappings...');
    await seedRolePermissions(roleMap, permissionMap);

    // Summary
    const totalPermissions = await Permissions.count();
    const totalRolePermissions = await RolePermissions.count();
    const totalRoles = await Roles.count();

    console.log('\n📊 Summary:');
    console.log(`   Total roles: ${totalRoles}`);
    console.log(`   Total permissions: ${totalPermissions}`);
    console.log(`   Total role-permission mappings: ${totalRolePermissions}`);

    console.log('\n🎉 Permission seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedPermissions({
        clearExisting: false,
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
  seedPermissions,
  ensureRolesExist,
  seedPermissionsTable,
  seedRolePermissions,
};
