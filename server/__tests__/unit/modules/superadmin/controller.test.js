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
jest.mock('@modules/superadmin/application/finance-admin.service', () => ({
  getFinanceOverview: jest.fn(),
  listPayments: jest.fn(),
  listRefunds: jest.fn(),
  listPayouts: jest.fn(),
  listLedgerEntries: jest.fn(),
}));
jest.mock('@platform/audit', () => ({
  auditService: { list: jest.fn(), recordFromRequest: jest.fn() },
}));

const { listUsers, getUser } = require('@modules/superadmin/application/user-admin.service');
const { listPayments } = require('@modules/superadmin/application/finance-admin.service');
const { auditService } = require('@platform/audit');
const controller = require('@modules/superadmin/api/superadmin.controller');

function requestWithPermissions(permissions) {
  return global.testUtils.mockRequest({
    user: {
      id: 'actor-1',
      email: 'actor@example.com',
      roles: [
        { role: { name: 'support_agent', permissions: permissions.map((name) => ({ name })) } },
      ],
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

  it('applies the same PII rule to finance lists', async () => {
    listPayments.mockResolvedValue({ payments: [], page: 1, limit: 20, total: 0 });
    const req = requestWithPermissions(['platform.finance.read']);
    const res = global.testUtils.mockResponse();

    await controller.listPaymentsHandler(req, res, jest.fn());

    expect(listPayments).toHaveBeenCalledWith({}, { unmaskPii: false });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('records a PII-access audit entry when unmasked PII is returned', async () => {
    getUser.mockResolvedValue({ id: 'u1' });
    const req = requestWithPermissions(['platform.user.read', 'platform.user.pii_read']);
    req.params = { userId: 'u1' };
    const res = global.testUtils.mockResponse();

    await controller.getUserHandler(req, res, jest.fn());

    expect(auditService.recordFromRequest).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'platform.pii.read',
        entityType: 'user',
        entityId: 'u1',
      })
    );
  });

  it('does not record a PII-access entry when PII stays masked', async () => {
    getUser.mockResolvedValue({ id: 'u1' });
    const req = requestWithPermissions(['platform.user.read']);
    req.params = { userId: 'u1' };
    const res = global.testUtils.mockResponse();

    await controller.getUserHandler(req, res, jest.fn());

    expect(auditService.recordFromRequest).not.toHaveBeenCalled();
  });

  it('serializes audit entries to camelCase (W-F4)', async () => {
    auditService.list.mockResolvedValue({
      entries: [
        {
          id: 'a1',
          actor_user_id: 'u1',
          actor_type: 'user',
          action: 'platform.pii.read',
          entity_type: 'user',
          entity_id: 'u9',
          hotel_id: null,
          reason: null,
          request_id: 'r1',
          metadata: { scope: 'detail' },
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 50,
      total: 1,
    });
    const req = requestWithPermissions(['platform.audit.read']);
    const res = global.testUtils.mockResponse();

    await controller.listAuditHandler(req, res, jest.fn());

    const body = res.json.mock.calls[0][0];
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: 'a1',
        actorUserId: 'u1',
        actorType: 'user',
        action: 'platform.pii.read',
        entityType: 'user',
        entityId: 'u9',
        hotelId: null,
        reason: null,
        requestId: 'r1',
        metadata: { scope: 'detail' },
        createdAt: '2024-01-01T00:00:00.000Z',
      })
    );
    expect(body.data[0].actor_user_id).toBeUndefined();
    expect(body.meta).toEqual({ page: 1, limit: 50, total: 1 });
  });
});
