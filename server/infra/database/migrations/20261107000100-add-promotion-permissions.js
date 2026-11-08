'use strict';

const PERMISSIONS = [
  ['promotion.read', 'View promotions and their usage'],
  ['promotion.manage', 'Create, edit, activate and pause promotions'],
];

const ROLE_PERMISSIONS = {
  staff: ['promotion.read'],
  manager: ['promotion.read', 'promotion.manage'],
  owner: ['promotion.read', 'promotion.manage'],
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
