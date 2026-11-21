'use strict';

const PERMISSIONS = [
  ['payment.manage_connected_accounts', 'Create and manage hotel Stripe Connect payout accounts'],
];

// Hotel owners need to be able to set up their own payout account without
// inheriting `payment.process` (payout generation/processing/status changes).
// Admin is granted for the existing-role permission set; it bypasses hotel
// checks in the API regardless.
const ROLE_PERMISSIONS = {
  owner: ['payment.manage_connected_accounts'],
  admin: ['payment.manage_connected_accounts'],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const [name, description] of PERMISSIONS) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO permissions (id, name, description, created_at, updated_at)
         VALUES (UUID(), :name, :description, :now, :now)`,
        { replacements: { name, description, now } }
      );
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permissionName of permissionNames) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
           SELECT UUID(), r.id, p.id, :now, :now
             FROM roles r
             JOIN permissions p ON p.name = :permissionName
            WHERE r.name = :roleName`,
          { replacements: { roleName, permissionName, now } }
        );
      }
    }
  },

  async down(queryInterface) {
    const names = PERMISSIONS.map(([name]) => name);
    await queryInterface.sequelize.query(
      `DELETE rp FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name IN (:names)`,
      { replacements: { names } }
    );
    await queryInterface.sequelize.query(`DELETE FROM permissions WHERE name IN (:names)`, {
      replacements: { names },
    });
  },
};
