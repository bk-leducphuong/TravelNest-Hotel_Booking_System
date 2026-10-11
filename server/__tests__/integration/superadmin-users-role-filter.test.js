require('../../register-aliases');

const db = require('@platform/database');
const { listUsers } = require('@modules/superadmin/infrastructure/superadmin.repository');

/**
 * Regression: `GET /superadmin/users?role=<name>` used to 500 with
 * `Unknown column 'roles.role_id' in 'on clause'` because of a nested
 * `users -> user_roles -> roles` include. This exercises the fixed lookup
 * against real MySQL.
 */
describe('superadmin listUsers role filter (integration)', () => {
  const created = { users: [], userRoles: [] };
  let adminRole;
  let adminUserId;
  let otherUserId;

  beforeAll(async () => {
    [adminRole] = await db.roles.findOrCreate({
      where: { name: 'admin' },
      defaults: { name: 'admin', description: 'Platform administrator' },
    });

    const admin = await db.users.create({
      email: `itest-admin-${Date.now()}@example.com`,
      first_name: 'Itest',
      last_name: 'Admin',
      status: 'active',
    });
    const other = await db.users.create({
      email: `itest-other-${Date.now()}@example.com`,
      first_name: 'Itest',
      last_name: 'Other',
      status: 'active',
    });

    adminUserId = admin.id;
    otherUserId = other.id;
    created.users = [admin.id, other.id];

    const link = await db.user_roles.create({ user_id: admin.id, role_id: adminRole.id });
    created.userRoles = [link.id];
  });

  afterAll(async () => {
    await db.user_roles.destroy({ where: { id: created.userRoles } });
    await db.users.destroy({ where: { id: created.users } });
  });

  it('filters users by global role without erroring', async () => {
    const result = await listUsers({ role: 'admin', limit: 100, offset: 0 });
    const ids = result.rows.map((user) => user.id);

    expect(ids).toContain(adminUserId);
    expect(ids).not.toContain(otherUserId);
  });

  it('returns an empty result for a role with no members (does not throw)', async () => {
    const result = await listUsers({ role: 'support_agent', limit: 100, offset: 0 });

    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.map((user) => user.id)).not.toContain(adminUserId);
  });

  it('returns all users when no role filter is given', async () => {
    const result = await listUsers({ limit: 100, offset: 0 });
    const ids = result.rows.map((user) => user.id);

    expect(ids).toContain(adminUserId);
    expect(ids).toContain(otherUserId);
  });
});
