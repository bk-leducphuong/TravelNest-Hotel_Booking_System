jest.mock('@modules/superadmin/application/user-admin.service', () => ({
  listUsers: jest.fn(),
  getUser: jest.fn(),
}));
jest.mock('@modules/superadmin/application/hotel-admin.service', () => ({
  listHotels: jest.fn(),
  getHotel: jest.fn(),
}));
jest.mock('@modules/superadmin/application/overview.service', () => ({
  getOverview: jest.fn(),
}));
jest.mock('@platform/audit', () => ({
  auditService: { list: jest.fn() },
}));

const { listUsers, getUser } = require('@modules/superadmin/application/user-admin.service');
const controller = require('@modules/superadmin/api/superadmin.controller');

function requestWithPermissions(permissions) {
  return global.testUtils.mockRequest({
    user: {
      id: 'actor-1',
      email: 'actor@example.com',
      roles: [{ role: { name: 'support_agent', permissions: permissions.map((name) => ({ name })) } }],
    },
    query: {},
  });
}

describe('superadmin controller - PII permission wiring', () => {
  it('masks PII when the caller lacks platform.user.pii_read', async () => {
    listUsers.mockResolvedValue({ users: [], page: 1, limit: 20, total: 0 });
    const req = requestWithPermissions(['platform.user.read']);
    const res = global.testUtils.mockResponse();

    await controller.listUsersHandler(req, res, jest.fn());

    expect(listUsers).toHaveBeenCalledWith({}, { unmaskPii: false });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('unmasks PII when the caller has platform.user.pii_read', async () => {
    getUser.mockResolvedValue({ id: 'u1' });
    const req = requestWithPermissions(['platform.user.read', 'platform.user.pii_read']);
    req.params = { userId: 'u1' };
    const res = global.testUtils.mockResponse();

    await controller.getUserHandler(req, res, jest.fn());

    expect(getUser).toHaveBeenCalledWith('u1', { unmaskPii: true });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
