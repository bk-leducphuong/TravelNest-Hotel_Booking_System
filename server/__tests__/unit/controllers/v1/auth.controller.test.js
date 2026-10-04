const authController = require('@modules/identity/api/auth.controller');

jest.mock('@helpers/auth-context.helper', () => ({
  buildAuthSession: jest.fn(),
}));

const { buildAuthSession } = require('@helpers/auth-context.helper');

describe('AuthController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('checkAuth', () => {
    it('returns the current authenticated principal', async () => {
      const session = {
        id: 'keycloak-subject',
        user: { id: 'user-1', type: 'USER' },
        context: null,
        authProvider: 'keycloak',
      };

      req.user = { id: 'user-1' };
      req.auth = { subject: 'keycloak-subject', provider: 'keycloak', roles: ['user'] };
      buildAuthSession.mockReturnValue(session);

      await authController.checkAuth(req, res, next);

      expect(buildAuthSession).toHaveBeenCalledWith(req.user, req.auth);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session,
          isAuthenticated: true,
        },
      });
    });

    it('returns an unauthenticated session when no bearer token was resolved', async () => {
      const session = {
        id: null,
        user: null,
        context: null,
        authProvider: 'keycloak',
      };

      buildAuthSession.mockReturnValue(session);

      await authController.checkAuth(req, res, next);

      expect(buildAuthSession).toHaveBeenCalledWith(null, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session,
          isAuthenticated: false,
        },
      });
    });
  });
});
