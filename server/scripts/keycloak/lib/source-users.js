require('../../../register-aliases');

const { Op } = require('sequelize');

const db = require('../../../models');

const MANAGED_ROLE_NAMES = ['user', 'admin', 'support_agent'];

async function fetchSourceUsers({ email = null, limit = null } = {}) {
  const where = {};
  if (email) {
    where.email = email.toLowerCase();
  }

  const users = await db.users.findAll({
    where,
    order: [['created_at', 'ASC']],
    limit: limit || undefined,
    include: [
      {
        model: db.auth_accounts,
        as: 'auth_accounts',
        attributes: ['id', 'provider', 'provider_user_id', 'password_hash'],
      },
      {
        model: db.user_roles,
        as: 'roles',
        attributes: ['id', 'role_id'],
        include: [
          {
            model: db.roles,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  return users.map((user) => {
    const plainUser = user.get({ plain: true });
    const normalizedEmail = plainUser.email?.trim().toLowerCase() || null;
    const managedRoles = (plainUser.roles || [])
      .map((entry) => entry.role?.name)
      .filter((roleName) => MANAGED_ROLE_NAMES.includes(roleName));
    const localAuthAccounts = (plainUser.auth_accounts || []).filter(
      (account) => account.provider === 'local'
    );

    return {
      ...plainUser,
      normalized_email: normalizedEmail,
      managed_role_names: Array.from(new Set(managedRoles)),
      local_auth_accounts: localAuthAccounts,
      auth_provider_names: Array.from(
        new Set((plainUser.auth_accounts || []).map((account) => account.provider).filter(Boolean))
      ),
    };
  });
}

async function findDuplicateEmails({ email = null } = {}) {
  const where = {
    deleted_at: {
      [Op.is]: null,
    },
  };

  if (email) {
    where.email = email.toLowerCase();
  }

  const rows = await db.users.findAll({
    where,
    attributes: ['email'],
    raw: true,
  });

  const counts = new Map();
  for (const row of rows) {
    const normalizedEmail = row.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      continue;
    }
    counts.set(normalizedEmail, (counts.get(normalizedEmail) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([duplicateEmail, count]) => ({ email: duplicateEmail, count }));
}

async function closeSource() {
  await db.sequelize.close();
}

module.exports = {
  MANAGED_ROLE_NAMES,
  closeSource,
  fetchSourceUsers,
  findDuplicateEmails,
};
