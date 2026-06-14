require('../../../register-aliases');
const express = require('express');
const request = require('supertest');

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
  });

  describe('Removed app-owned auth flows', () => {
    const deprecatedEndpoints = [
      ['post', '/api/v1/auth/users'],
      ['post', '/api/v1/auth/sessions'],
      ['delete', '/api/v1/auth/sessions'],
      ['post', '/api/v1/auth/email/check'],
      ['get', '/api/v1/auth/csrf-token'],
      ['get', '/api/v1/auth/google'],
      ['get', '/api/v1/auth/google/callback'],
      ['get', '/api/v1/auth/twitter'],
      ['get', '/api/v1/auth/twitter/callback'],
    ];

    it.each(deprecatedEndpoints)('returns 410 for %s %s', async (method, url) => {
      const res = await request(app)[method](url);

      expect(res.status).toBe(410);
      expect(res.body).toEqual({
        error: {
          code: 'AUTH_FLOW_REMOVED',
          message:
            'This auth flow is no longer served by TravelNest. Use Keycloak/OpenID Connect for login, logout, registration, password reset, and social sign-in.',
        },
      });
    });
  });
});
