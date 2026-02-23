const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const request = require('supertest');

require('module-alias/register');

const authRoutes = require('../../../routes/v1/auth.routes');
const errorMiddleware = require('@middlewares/error.middleware');
const authService = require('@services/auth.service');
const { buildSession } = require('@helpers/session.helper');

// Mock service and helpers to avoid hitting real DB, email, etc.
jest.mock('@services/auth.service');
jest.mock('@helpers/session.helper', () => ({
  buildSession: jest.fn((sessionId, userData) => ({
    sessionId,
    user: userData,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  })),
}));

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();

    // Minimal middleware stack for auth routes
    app.use(bodyParser.json());

    // Use in-memory session store for tests (no Redis)
    app.use(
      session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false,
      })
    );

    app.use('/api/v1/auth', authRoutes);
    app.use(errorMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/users (register)', () => {
    const baseUrl = '/api/v1/auth/users';

    it('should register a new user and create session', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        userRole: 'user',
      };

      const mockUserData = {
        userId: 'user-123',
        userRole: 'user',
        userData: {
          id: 'user-123',
          email: registrationData.email,
          first_name: registrationData.firstName,
          last_name: registrationData.lastName,
          status: 'active',
        },
      };

      authService.register.mockResolvedValue(mockUserData);

      const res = await request(app).post(baseUrl).send(registrationData);

      expect(res.status).toBe(201);
      expect(authService.register).toHaveBeenCalledWith(
        registrationData.email,
        registrationData.password,
        registrationData.firstName,
        registrationData.lastName,
        registrationData.userRole
      );

      expect(buildSession).toHaveBeenCalledWith(
        expect.any(String),
        mockUserData.userData
      );

      expect(res.body).toHaveProperty('data.session');
      expect(res.body.data).toHaveProperty(
        'message',
        'User registered successfully'
      );
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should validate request body and return 400 for invalid data', async () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'short',
        firstName: '',
        lastName: '',
        userRole: 'invalid_role',
      };

      const res = await request(app).post(baseUrl).send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/sessions (login)', () => {
    const baseUrl = '/api/v1/auth/sessions';

    it('should login user and create session', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'Password123!',
        userRole: 'user',
      };

      const mockUser = {
        id: 'user-123',
        email: credentials.email,
        first_name: 'Test',
        last_name: 'User',
        status: 'active',
      };

      const mockSessionData = {
        userId: mockUser.id,
        userRole: 'user',
        userData: mockUser,
      };

      authService.login.mockResolvedValue(mockSessionData);

      const res = await request(app).post(baseUrl).send(credentials);

      expect(res.status).toBe(201);
      expect(authService.login).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
        credentials.userRole
      );

      expect(buildSession).toHaveBeenCalledWith(expect.any(String), mockUser);

      expect(res.body).toHaveProperty('data.session');
      expect(res.body.data).toHaveProperty('message', 'Logged in successfully');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 400 for validation error', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: 'short',
        userRole: 'not-a-role',
      };

      const res = await request(app).post(baseUrl).send(invalidCredentials);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should return 401 when credentials are invalid', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'wrong-password',
        userRole: 'user',
      };

      const ApiError = require('@utils/ApiError');
      const error = new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );

      authService.login.mockRejectedValue(error);

      const res = await request(app).post(baseUrl).send(credentials);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error.code', 'INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/session (checkAuth)', () => {
    const baseUrl = '/api/v1/auth/session';

    it('should return unauthenticated session when no user in session', async () => {
      const res = await request(app).get(baseUrl);

      expect(res.status).toBe(200);
      expect(buildSession).toHaveBeenCalledWith(expect.any(String), null);
      expect(res.body).toHaveProperty('data.session');
      expect(res.body.data).toHaveProperty('isAuthenticated', false);
    });

    it('should return authenticated session when user is in session', async () => {
      const agent = request.agent(app);

      // First, simulate login by setting session.userData via mocked login
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        status: 'active',
      };

      const mockSessionData = {
        userId: mockUser.id,
        userRole: 'user',
        userData: mockUser,
      };

      authService.login.mockResolvedValue(mockSessionData);

      await agent.post('/api/v1/auth/sessions').send({
        email: 'user@example.com',
        password: 'Password123!',
        userRole: 'user',
      });

      const res = await agent.get(baseUrl);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('session');
      expect(res.body.data).toHaveProperty('isAuthenticated', true);
    });
  });

  describe('POST /api/v1/auth/email/check', () => {
    const baseUrl = '/api/v1/auth/email/check';

    it('should return exists: true when email exists', async () => {
      authService.checkEmail.mockResolvedValue({ exists: true });

      const res = await request(app).post(baseUrl).send({
        email: 'existing@example.com',
        userRole: 'user',
      });

      expect(res.status).toBe(200);
      expect(authService.checkEmail).toHaveBeenCalledWith(
        'existing@example.com',
        'user'
      );
      expect(res.body).toEqual({ data: { exists: true } });
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app).post(baseUrl).send({
        email: 'not-an-email',
        userRole: 'user',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
      expect(authService.checkEmail).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/auth/sessions (logout)', () => {
    const baseUrl = '/api/v1/auth/sessions';

    it('should logout successfully and clear cookie', async () => {
      const agent = request.agent(app);

      // Simulate a logged-in session
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const mockSessionData = {
        userId: mockUser.id,
        userRole: 'user',
        userData: mockUser,
      };

      authService.login.mockResolvedValue(mockSessionData);

      await agent.post('/api/v1/auth/sessions').send({
        email: 'user@example.com',
        password: 'Password123!',
        userRole: 'user',
      });

      const res = await agent.delete(baseUrl);

      expect(res.status).toBe(204);
    });
  });
});

