const holdController = require('@controllers/v1/hold.controller');
const holdService = require('@services/hold.service');
const ApiError = require('@utils/ApiError');

const {
  createMockCreateHoldPayload,
  createMockCreateHoldResponse,
  createMockReleaseHoldResponse,
  createMockHoldRecord,
} = require('../../../fixtures/hold.fixtures');

jest.mock('@services/hold.service');

describe('HoldController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('createHold', () => {
    it('should return 201 and hold data when createHold succeeds', async () => {
      const userId = 'user-uuid-123';
      req.session = { user: { user_id: userId } };
      req.body = createMockCreateHoldPayload();
      const mockResponse = createMockCreateHoldResponse();

      holdService.createHold.mockResolvedValue(mockResponse);

      await holdController.createHold(req, res, next);

      expect(holdService.createHold).toHaveBeenCalledWith({
        userId,
        hotelId: req.body.hotelId,
        checkInDate: req.body.checkInDate,
        checkOutDate: req.body.checkOutDate,
        numberOfGuests: req.body.numberOfGuests ?? 1,
        rooms: req.body.rooms,
        currency: req.body.currency,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: mockResponse,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getMyHolds', () => {
    it('should return 200 and list of holds for authenticated user', async () => {
      const userId = 'user-uuid-123';
      req.session = { user: { user_id: userId } };
      const mockHolds = [{ ...createMockHoldRecord(), totalPrice: 199.99, expiresAt: new Date() }];

      holdService.getActiveHoldsByUser.mockResolvedValue(mockHolds);

      await holdController.getMyHolds(req, res, next);

      expect(holdService.getActiveHoldsByUser).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockHolds,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getHoldById', () => {
    it('should return 200 and hold when user is owner', async () => {
      const userId = 'user-uuid-123';
      const holdId = 'hold-uuid-456';
      req.session = { user: { user_id: userId } };
      req.params = { holdId };
      const mockHold = {
        ...createMockHoldRecord({ id: holdId, user_id: userId }),
        totalPrice: 299.99,
        isExpired: false,
      };

      holdService.getHold.mockResolvedValue(mockHold);

      await holdController.getHoldById(req, res, next);

      expect(holdService.getHold).toHaveBeenCalledWith(holdId, userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockHold,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('releaseHold', () => {
    it('should return 200 and release result when user is owner', async () => {
      const userId = 'user-uuid-123';
      const holdId = 'hold-uuid-456';
      req.session = { user: { user_id: userId } };
      req.params = { holdId };
      const mockResponse = createMockReleaseHoldResponse({ holdId, status: 'released' });

      holdService.releaseHold.mockResolvedValue(mockResponse);

      await holdController.releaseHold(req, res, next);

      expect(holdService.releaseHold).toHaveBeenCalledWith(holdId, userId, 'released');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockResponse,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const userId = 'user-uuid-123';
      req.session = { user: { user_id: userId } };
      req.params = { holdId: 'hold-123' };
      const error = new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found');

      holdService.releaseHold.mockRejectedValue(error);

      await holdController.releaseHold(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
