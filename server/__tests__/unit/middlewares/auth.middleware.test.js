const {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  authenticateRequest,
} = require('@middlewares/auth.middleware');

jest.mock('@services/identity.service', () => ({
  resolveAuthenticatedUser: jest.fn(),
}));

jest.mock('@services/keycloak-userinfo.service', () => ({
  getUserInfo: jest.fn(),
}));

jest.mock('@utils/jwt.util', () => ({
  verifyJwt: jest.fn(),
}));

jest.mock('@config/logger.config', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const identityService = require('@services/identity.service');
const keycloakUserInfoService = require('@services/keycloak-userinfo.service');
const { verifyJwt } = require('@utils/jwt.util');
const ApiError = require('@utils/ApiError');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('authenticateRequest', () => {
    it('resolves the bearer token into req.auth and req.user', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      const verifiedToken = {
        subject: 'kc-user-1',
        email: 'user@example.com',
        roles: ['user'],
        payload: { sub: 'kc-user-1' },
      };
      const resolvedUser = { id: 'local-user-1', status: 'active' };

      verifyJwt.mockReturnValue(verifiedToken);
      identityService.resolveAuthenticatedUser.mockResolvedValue(resolvedUser);

      await authenticateRequest(req);

      expect(verifyJwt).toHaveBeenCalledWith('signed.jwt.token');
      expect(identityService.resolveAuthenticatedUser).toHaveBeenCalledWith(verifiedToken);
      expect(req.auth).toEqual({
        provider: 'keycloak',
        subject: 'kc-user-1',
        email: 'user@example.com',
        roles: ['user'],
        token: { sub: 'kc-user-1' },
      });
      expect(req.user).toBe(resolvedUser);
    });

    it('falls back to Keycloak userinfo when the access token is missing subject and email', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      const verifiedToken = {
        subject: null,
        email: null,
        roles: ['user'],
        payload: { scope: 'openid profile email' },
      };
      const resolvedUser = { id: 'local-user-1', status: 'active' };

      verifyJwt.mockReturnValue(verifiedToken);
      keycloakUserInfoService.getUserInfo.mockResolvedValue({
        sub: 'kc-user-2',
        email: 'fallback@example.com',
      });
      identityService.resolveAuthenticatedUser.mockResolvedValue(resolvedUser);

      await authenticateRequest(req);

      expect(keycloakUserInfoService.getUserInfo).toHaveBeenCalledWith('signed.jwt.token');
      expect(identityService.resolveAuthenticatedUser).toHaveBeenCalledWith({
        subject: 'kc-user-2',
        email: 'fallback@example.com',
        roles: ['user'],
        payload: {
          scope: 'openid profile email',
          sub: 'kc-user-2',
          email: 'fallback@example.com',
        },
      });
      expect(req.auth).toEqual({
        provider: 'keycloak',
        subject: 'kc-user-2',
        email: 'fallback@example.com',
        roles: ['user'],
        token: {
          scope: 'openid profile email',
          sub: 'kc-user-2',
          email: 'fallback@example.com',
        },
      });
      expect(req.user).toBe(resolvedUser);
    });

    it('normalizes invalid JWT errors into INVALID_TOKEN api errors', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      verifyJwt.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(authenticateRequest(req)).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'jwt malformed',
      });
    });
  });

  describe('authenticate', () => {
    it('returns 401 when no bearer token is present', async () => {
      req.get = jest.fn(() => undefined);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when authentication succeeds', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      verifyJwt.mockReturnValue({
        subject: 'kc-user-1',
        email: 'user@example.com',
        roles: ['user'],
        payload: { sub: 'kc-user-1' },
      });
      identityService.resolveAuthenticatedUser.mockResolvedValue({ id: 'local-user-1' });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('skips authentication when no bearer token is present', async () => {
      req.get = jest.fn(() => undefined);

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(verifyJwt).not.toHaveBeenCalled();
    });

    it('swallows invalid-token failures and continues anonymously', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      verifyJwt.mockImplementation(() => {
        throw new ApiError(401, 'INVALID_TOKEN', 'jwt malformed');
      });

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('surfaces provisioning failures when a valid bearer token is present', async () => {
      req.get = jest.fn((header) =>
        header.toLowerCase() === 'authorization' ? 'Bearer signed.jwt.token' : undefined
      );

      verifyJwt.mockReturnValue({
        subject: 'kc-user-1',
        email: 'user@example.com',
        roles: ['user'],
        payload: { sub: 'kc-user-1', email_verified: false },
      });
      identityService.resolveAuthenticatedUser.mockRejectedValue(
        new ApiError(
          403,
          'EMAIL_VERIFICATION_REQUIRED',
          'Verify your email address in Keycloak before accessing TravelNest.'
        )
      );

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'EMAIL_VERIFICATION_REQUIRED',
        })
      );
    });
  });

  describe('requirePermission', () => {
    it('allows admin tokens through even without explicit permission joins', async () => {
      req.user = {
        roles: [],
        hotel_roles: [],
      };
      req.auth = { roles: ['admin'] };

      const middleware = requirePermission('hotel.read');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies unauthenticated access', async () => {
      const middleware = requirePermission('hotel.read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.',
      });
    });

    it('enforces hotel context access from local hotel memberships', async () => {
      req.user = {
        roles: [],
        hotel_roles: [
          {
            hotel_id: 'hotel-1',
            role_id: 'role-1',
            role: { name: 'owner' },
            is_primary_owner: true,
          },
        ],
      };
      req.auth = { roles: ['user'] };
      req.params = { hotelId: 'hotel-1' };

      const middleware = requirePermission('hotel.manage_staff', {
        requireHotelContext: true,
      });

      await middleware(req, res, next);

      expect(req.hotelContext).toEqual({
        hotelId: 'hotel-1',
        role: 'owner',
        roleId: 'role-1',
        isPrimaryOwner: true,
      });
      expect(next).toHaveBeenCalled();
    });
  });
});
