require('module-alias/register');
const request = require('supertest');
const createApp = require('../../../app');

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
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

      const res = await request(app).post(baseUrl).send(registrationData);

      expect(res.status).toBe(201);
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

      // First register the user
      await request(app).post('/api/v1/auth/users').send({
        email: credentials.email,
        password: credentials.password,
        firstName: 'Test',
        lastName: 'User',
        userRole: 'user',
      });

      const res = await request(app).post(baseUrl).send(credentials);

      expect(res.status).toBe(201);
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
    });

    it('should return 401 when credentials are invalid', async () => {
      const validCredentials = {
        email: 'invalid-user@example.com',
        password: 'Password123!',
        userRole: 'user',
      };

      // Ensure no user exists or wrong password is used
      const res = await request(app).post(baseUrl).send(validCredentials);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error.code', 'INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/session (checkAuth)', () => {
    const baseUrl = '/api/v1/auth/session';

    it('should return authenticated session when user is in session', async () => {
      const agent = request.agent(app);

      // Register and login to create a real session
      await agent.post('/api/v1/auth/users').send({
        email: 'session-user@example.com',
        password: 'Password123!',
        firstName: 'Session',
        lastName: 'User',
        userRole: 'user',
      });

      await agent.post('/api/v1/auth/sessions').send({
        email: 'session-user@example.com',
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
      const email = 'existing@example.com';

      // Ensure the email exists by registering a user
      await request(app).post('/api/v1/auth/users').send({
        email,
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User',
        userRole: 'user',
      });

      const res = await request(app).post(baseUrl).send({
        email,
        userRole: 'user',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: { exists: true } });
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app).post(baseUrl).send({
        email: 'not-an-email',
        userRole: 'user',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/auth/sessions (logout)', () => {
    const baseUrl = '/api/v1/auth/sessions';

    it('should logout successfully and clear cookie', async () => {
      const agent = request.agent(app);

      // Register and login to create a real session
      await agent.post('/api/v1/auth/users').send({
        email: 'logout-user@example.com',
        password: 'Password123!',
        firstName: 'Logout',
        lastName: 'User',
        userRole: 'user',
      });

      await agent.post('/api/v1/auth/sessions').send({
        email: 'logout-user@example.com',
        password: 'Password123!',
        userRole: 'user',
      });

      const res = await agent.delete(baseUrl);

      expect(res.status).toBe(204);
    });
  });
});
