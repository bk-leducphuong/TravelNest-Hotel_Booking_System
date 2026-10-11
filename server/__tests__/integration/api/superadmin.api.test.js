require('../../../register-aliases');
const express = require('express');
const request = require('supertest');

jest.mock('@modules/identity', () => ({
  identity: { resolveAuthenticatedUser: jest.fn() },
  keycloak: { getUserInfo: jest.fn() },
}));

jest.mock('@utils/jwt.util', () => ({
  verifyJwt: jest.fn(),
}));

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

const { identity: identityService } = require('@modules/identity');
const { verifyJwt } = require('@utils/jwt.util');
const { listUsers } = require('@modules/superadmin/application/user-admin.service');
const { auditService } = require('@platform/audit');

const superadminRoutes = require('../../../modules/superadmin/api/superadmin.routes');
const errorMiddleware = require('../../../middlewares/error.middleware');

/**
 * HTTP-level authorization tests for the superadmin API: the platform role and
 * permission boundary, and the PII masking / auditing rule.
 */
function authenticateAs({ tokenRoles, roleName, permissions }) {
  verifyJwt.mockReturnValue({
    subject: 'kc-1',
    email: 'actor@example.com',
    roles: tokenRoles,
    payload: { sub: 'kc-1' },
  });
  identityService.resolveAuthenticatedUser.mockResolvedValue({
    id: 'actor-1',
    email: 'actor@example.com',
    status: 'active',
    roles: [{ role: { name: roleName, permissions: permissions.map((name) => ({ name })) } }],
    hotel_roles: [],
  });
}

describe('Superadmin API integration', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/superadmin', superadminRoutes);
    app.use(errorMiddleware);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listUsers.mockResolvedValue({ users: [], page: 1, limit: 20, total: 0 });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/superadmin/overview');
    expect(res.status).toBe(401);
  });

  it('denies a non-platform user', async () => {
    authenticateAs({ tokenRoles: ['user'], roleName: 'user', permissions: [] });

    const res = await request(app)
      .get('/api/v1/superadmin/users')
      .set('Authorization', 'Bearer valid.token');

    expect(res.status).toBe(403);
  });

  it('lets a support_agent read users with PII masked', async () => {
    authenticateAs({
      tokenRoles: ['support_agent'],
      roleName: 'support_agent',
      permissions: ['platform.user.read'],
    });

    const res = await request(app)
      .get('/api/v1/superadmin/users')
      .set('Authorization', 'Bearer valid.token');

    expect(res.status).toBe(200);
    expect(listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { unmaskPii: false }
    );
    expect(auditService.recordFromRequest).not.toHaveBeenCalled();
  });

  it('unmasks PII and records an audit entry when the caller holds pii_read', async () => {
    authenticateAs({
      tokenRoles: ['admin'],
      roleName: 'admin',
      permissions: ['platform.user.read', 'platform.user.pii_read'],
    });

    const res = await request(app)
      .get('/api/v1/superadmin/users')
      .set('Authorization', 'Bearer valid.token');

    expect(res.status).toBe(200);
    expect(listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { unmaskPii: true }
    );
    expect(auditService.recordFromRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'platform.pii.read', entityType: 'user' })
    );
  });
});
