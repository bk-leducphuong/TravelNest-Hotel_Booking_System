const { socketAuthentication } = require('@platform/realtime/auth');

jest.mock('@utils/jwt.util', () => ({ verifyJwt: jest.fn() }));
jest.mock('@config/logger.config', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('@modules/identity', () => ({
  identity: { resolveAuthenticatedUser: jest.fn() },
  extractUserRoles: jest.fn(() => []),
  extractUserPermissions: jest.fn(() => []),
  extractHotelRoles: jest.fn(() => []),
  hasHotelRole: jest.fn(() => false),
}));

const { verifyJwt } = require('@utils/jwt.util');
const { identity } = require('@modules/identity');

describe('realtime socketAuthentication', () => {
  const buildSocket = () => ({
    id: 'socket-1',
    handshake: { auth: { token: 'signed.jwt.token' }, headers: {}, query: {} },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression guard: verifyJwt became async when JWKS support was added. The
  // socket middleware must await it, otherwise resolveAuthenticatedUser
  // receives a pending Promise and every authenticated socket is rejected with
  // "Bearer token is missing the subject claim".
  it('awaits the async verifyJwt result before resolving the user', async () => {
    const claims = { subject: 'sub-1', email: 'user@example.com', roles: ['user'], payload: {} };
    verifyJwt.mockResolvedValue(claims);
    identity.resolveAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      status: 'active',
    });

    const socket = buildSocket();
    const next = jest.fn();

    await socketAuthentication(socket, next);

    expect(identity.resolveAuthenticatedUser).toHaveBeenCalledWith(claims);
    expect(socket.user).toEqual(expect.objectContaining({ id: 'user-1' }));
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects connections that carry no token', async () => {
    const socket = buildSocket();
    socket.handshake.auth = {};
    const next = jest.fn();

    await socketAuthentication(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects connections whose token fails verification', async () => {
    verifyJwt.mockRejectedValue(new Error('Invalid JWT signature'));
    const next = jest.fn();

    await socketAuthentication(buildSocket(), next);

    expect(identity.resolveAuthenticatedUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
