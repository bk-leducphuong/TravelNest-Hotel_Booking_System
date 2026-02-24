const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const request = require('supertest');

require('module-alias/register');

const holdService = require('@services/hold.service');

jest.mock('@services/hold.service');

// Mock auth middleware so we can simulate authenticated user via X-Test-User-Id header
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    const testUserId = req.get ? req.get('X-Test-User-Id') : req.headers['x-test-user-id'];
    if (testUserId) {
      req.session = req.session || {};
      req.session.user = { user_id: testUserId };
      return next();
    }
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Please log in.',
    });
  },
  requirePermission: () => (req, res, next) => next(),
}));

const holdRoutes = require('../../../routes/v1/hold.routes');
const errorMiddleware = require('@middlewares/error.middleware');

describe('Hold API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();

    app.use(bodyParser.json());
    app.use(
      session({
        secret: 'test-hold-secret',
        resave: false,
        saveUninitialized: false,
      })
    );

    app.use('/api/v1/hold', holdRoutes);
    app.use(errorMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const authenticatedRequest = (userId = 'test-user-uuid') => {
    const agent = request.agent(app);
    agent.set('X-Test-User-Id', userId);
    return agent;
  };

  describe('POST /api/v1/hold', () => {
    const baseUrl = '/api/v1/hold';
    const validPayload = {
      hotelId: '550e8400-e29b-41d4-a716-446655440000',
      checkInDate: '2026-04-01',
      checkOutDate: '2026-04-04',
      numberOfGuests: 2,
      rooms: [
        { roomId: '660e8400-e29b-41d4-a716-446655440001', quantity: 1 },
        { roomId: '660e8400-e29b-41d4-a716-446655440002', quantity: 1 },
      ],
      currency: 'USD',
    };

    it('should return 201 and hold data when payload is valid and user authenticated', async () => {
      const mockResponse = {
        holdId: '770e8400-e29b-41d4-a716-446655440000',
        checkInDate: validPayload.checkInDate,
        checkOutDate: validPayload.checkOutDate,
        numberOfGuests: 2,
        quantity: 2,
        totalPrice: 399.99,
        currency: 'USD',
        status: 'active',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        rooms: validPayload.rooms,
      };

      holdService.createHold.mockResolvedValue(mockResponse);

      const res = await authenticatedRequest()
        .post(baseUrl)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        holdId: mockResponse.holdId,
        checkInDate: validPayload.checkInDate,
        status: 'active',
      });
      expect(holdService.createHold).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: validPayload.hotelId,
          checkInDate: validPayload.checkInDate,
          checkOutDate: validPayload.checkOutDate,
          numberOfGuests: 2,
          rooms: validPayload.rooms,
        })
      );
    });

    it('should return 400 when request body is invalid', async () => {
      const invalidPayload = {
        hotelId: 'not-a-uuid',
        checkInDate: '2026-04-01',
        checkOutDate: '2026-03-01',
        rooms: [],
      };

      const res = await authenticatedRequest().post(baseUrl).send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(holdService.createHold).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).post(baseUrl).send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(holdService.createHold).not.toHaveBeenCalled();
    });

    it('should return 409 when service throws ROOMS_NOT_AVAILABLE', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.createHold.mockRejectedValue(
        new ApiError(409, 'ROOMS_NOT_AVAILABLE', 'Selected rooms are not available')
      );

      const res = await authenticatedRequest().post(baseUrl).send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error.code', 'ROOMS_NOT_AVAILABLE');
    });
  });

  describe('GET /api/v1/hold', () => {
    const baseUrl = '/api/v1/hold';

    it('should return 200 and list of holds when authenticated', async () => {
      const mockHolds = [
        {
          id: 'hold-uuid-1',
          user_id: 'test-user-uuid',
          totalPrice: 199.99,
          expiresAt: new Date(),
        },
      ];

      holdService.getActiveHoldsByUser.mockResolvedValue(mockHolds);

      const res = await authenticatedRequest().get(baseUrl);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(holdService.getActiveHoldsByUser).toHaveBeenCalledWith('test-user-uuid');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(baseUrl);

      expect(res.status).toBe(401);
      expect(holdService.getActiveHoldsByUser).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/hold/:holdId', () => {
    const holdId = '550e8400-e29b-41d4-a716-446655440000';
    const baseUrl = `/api/v1/hold/${holdId}`;

    it('should return 200 and hold when user is owner', async () => {
      const mockHold = {
        id: holdId,
        user_id: 'test-user-uuid',
        totalPrice: 299.99,
        isExpired: false,
      };

      holdService.getHold.mockResolvedValue(mockHold);

      const res = await authenticatedRequest('test-user-uuid').get(baseUrl);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: holdId,
        totalPrice: 299.99,
      });
      expect(holdService.getHold).toHaveBeenCalledWith(holdId, 'test-user-uuid');
    });

    it('should return 403 when user is not owner', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.getHold.mockRejectedValue(
        new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this hold')
      );

      const res = await authenticatedRequest('other-user').get(baseUrl);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error.code', 'FORBIDDEN');
    });

    it('should return 404 when hold not found', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.getHold.mockRejectedValue(
        new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found')
      );

      const res = await authenticatedRequest().get(baseUrl);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error.code', 'HOLD_NOT_FOUND');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(baseUrl);

      expect(res.status).toBe(401);
      expect(holdService.getHold).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/hold/:holdId', () => {
    const holdId = '550e8400-e29b-41d4-a716-446655440000';
    const baseUrl = `/api/v1/hold/${holdId}`;

    it('should return 200 and release result when user is owner', async () => {
      const mockResponse = { holdId, status: 'released' };
      holdService.releaseHold.mockResolvedValue(mockResponse);

      const res = await authenticatedRequest('test-user-uuid').delete(baseUrl);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockResponse);
      expect(holdService.releaseHold).toHaveBeenCalledWith(
        holdId,
        'test-user-uuid',
        'released'
      );
    });

    it('should return 404 when hold not found', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.releaseHold.mockRejectedValue(
        new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found')
      );

      const res = await authenticatedRequest().delete(baseUrl);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error.code', 'HOLD_NOT_FOUND');
    });

    it('should return 403 when user is not owner', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.releaseHold.mockRejectedValue(
        new ApiError(403, 'FORBIDDEN', 'You do not have permission to release this hold')
      );

      const res = await authenticatedRequest('other-user').delete(baseUrl);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error.code', 'FORBIDDEN');
    });

    it('should return 400 when hold is not active', async () => {
      const ApiError = require('@utils/ApiError');
      holdService.releaseHold.mockRejectedValue(
        new ApiError(400, 'HOLD_NOT_ACTIVE', 'Hold is already released')
      );

      const res = await authenticatedRequest().delete(baseUrl);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.code', 'HOLD_NOT_ACTIVE');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(baseUrl);

      expect(res.status).toBe(401);
      expect(holdService.releaseHold).not.toHaveBeenCalled();
    });
  });
});
