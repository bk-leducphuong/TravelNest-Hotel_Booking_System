require('../../../register-aliases');
const express = require('express');
const request = require('supertest');
jest.mock('@modules/identity', () => ({
  identity: { resolveAuthenticatedUser: jest.fn() },
}));

jest.mock('@utils/jwt.util', () => ({
  verifyJwt: jest.fn(),
}));

const { identity: identityService } = require('@modules/identity');
const { verifyJwt } = require('@utils/jwt.util');

const authRoutes = require('../../../routes/v1/auth.routes');
const errorMiddleware = require('../../../middlewares/error.middleware');

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorMiddleware);
  });

  describe('GET /api/v1/auth/session', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an unauthenticated principal when no bearer token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/session');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: {
          session: {
            id: null,
            user: null,
            context: null,
            authProvider: 'keycloak',
          },
          isAuthenticated: false,
        },
      });
    });

    it('returns a hydrated session for verified bearer tokens', async () => {
      verifyJwt.mockReturnValue({
        subject: 'kc-user-1',
        email: 'user@example.com',
        roles: ['user'],
        payload: { sub: 'kc-user-1', email_verified: true },
      });
      identityService.resolveAuthenticatedUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        status: 'active',
        roles: [{ role: { name: 'user' } }],
        hotel_roles: [],
      });

      const res = await request(app)
        .get('/api/v1/auth/session')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body.data.isAuthenticated).toBe(true);
      expect(res.body.data.session).toEqual({
        id: 'kc-user-1',
        user: {
          id: 'user-1',
          type: 'USER',
          email: 'user@example.com',
          roles: ['user'],
        },
        context: null,
        authProvider: 'keycloak',
      });
    });
  });
});
