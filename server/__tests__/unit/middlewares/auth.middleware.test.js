const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const { Users, UserRoles, Roles, Permissions, HotelUsers } = require('@models/index.js');

const {
  createMockAuthUser,
  createMockUserWithContext,
  createMockUserWithHotelContext,
  createMockPermission,
  createMockRole,
} = require('../../fixtures/auth.fixtures');

// Mock the models
jest.mock('@models/index.js', () => ({
  Users: {
    findByPk: jest.fn(),
  },
  UserRoles: {},
  Roles: {},
  Permissions: {},
  RolePermissions: {},
  HotelUsers: {},
}));

// Mock logger
jest.mock('@config/logger.config', () => ({
  error: jest.fn(),
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('authenticate', () => {
    it('should authenticate user successfully when session exists', async () => {
      // Arrange
      const mockUser = createMockUserWithContext({ id: 1, status: 'active' });
      req.session = {
        userData: { id: 1 },
      };
      Users.findByPk.mockResolvedValue(mockUser);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(Users.findByPk).toHaveBeenCalledWith(1, {
        include: expect.any(Array),
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when session does not exist', async () => {
      // Arrange
      req.session = {};

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized access. Please log in.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user data', async () => {
      // Arrange
      req.session = { userData: null };

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized access. Please log in.',
      });
    });

    it('should return 401 when user not found in database', async () => {
      // Arrange
      req.session = { userData: { id: 999 } };
      Users.findByPk.mockResolvedValue(null);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user account is not active', async () => {
      // Arrange
      const mockUser = createMockUserWithContext({
        id: 1,
        status: 'suspended',
      });
      req.session = { userData: { id: 1 } };
      Users.findByPk.mockResolvedValue(mockUser);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is suspended. Please contact support.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when database error occurs', async () => {
      // Arrange
      req.session = { userData: { id: 1 } };
      Users.findByPk.mockRejectedValue(new Error('Database error'));

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication error.',
      });
    });
  });

  describe('requirePermission', () => {
    describe('without hotel context', () => {
      it('should allow access when user has required permission', async () => {
        // Arrange
        const permissions = [
          createMockPermission({ name: 'hotel.read' }),
          createMockPermission({ name: 'booking.read' }),
        ];
        const role = createMockRole({ permissions });
        const mockUser = createMockUserWithContext({
          roles: [{ role }],
        });
        req.user = mockUser;

        const middleware = requirePermission('hotel.read');

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow access when user has any of multiple required permissions', async () => {
        // Arrange
        const permissions = [createMockPermission({ name: 'hotel.write' })];
        const role = createMockRole({ permissions });
        const mockUser = createMockUserWithContext({
          roles: [{ role }],
        });
        req.user = mockUser;

        const middleware = requirePermission(['hotel.read', 'hotel.write']);

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();
      });

      it('should deny access when user lacks required permission', async () => {
        // Arrange
        const permissions = [createMockPermission({ name: 'booking.read' })];
        const role = createMockRole({ permissions });
        const mockUser = createMockUserWithContext({
          roles: [{ role }],
        });
        req.user = mockUser;

        const middleware = requirePermission('hotel.write');

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when user not authenticated', async () => {
        // Arrange
        req.user = null;
        const middleware = requirePermission('hotel.read');

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Authentication required.',
        });
      });
    });

    describe('with hotel context', () => {
      it('should allow access when user has hotel context and permission', async () => {
        // Arrange
        const permissions = [createMockPermission({ name: 'hotel.manage_staff' })];
        const role = createMockRole({ permissions });
        const hotelRole = createMockRole({ id: 5, name: 'hotel_manager' });

        const mockUser = createMockUserWithHotelContext({
          roles: [{ role }],
          hotel_roles: [
            {
              hotel_id: 1,
              role_id: 5,
              role: hotelRole,
              is_primary_owner: false,
            },
          ],
        });

        req.user = mockUser;
        req.params = { hotelId: 1 };

        const middleware = requirePermission('hotel.manage_staff', {
          requireHotelContext: true,
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();
        expect(req.hotelContext).toEqual({
          hotelId: 1,
          role: hotelRole.name,
          roleId: 5,
          isPrimaryOwner: false,
        });
      });

      it('should allow access for hotel owner regardless of permissions', async () => {
        // Arrange
        const ownerRole = createMockRole({ name: 'owner' });
        const mockUser = createMockUserWithHotelContext({
          hotel_roles: [{ hotel_id: 1, role: ownerRole }],
        });

        req.user = mockUser;
        req.params = { hotelId: 1 };

        const middleware = requirePermission('any.permission', {
          requireHotelContext: true,
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();
        expect(req.hotelContext).toBeDefined();
      });

      it('should deny access when user has no access to hotel', async () => {
        // Arrange
        const mockUser = createMockUserWithContext({
          hotel_roles: [], // No hotel roles
        });

        req.user = mockUser;
        req.params = { hotelId: 1 };

        const middleware = requirePermission('hotel.manage_staff', {
          requireHotelContext: true,
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have access to this hotel.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 400 when hotel context is required but hotelId is missing', async () => {
        // Arrange
        const mockUser = createMockUserWithContext();
        req.user = mockUser;
        req.params = {}; // No hotelId
        req.body = {};
        req.session = {};

        const middleware = requirePermission('hotel.manage_staff', {
          requireHotelContext: true,
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Hotel context is required for this operation.',
        });
      });

      it('should deny access when user has wrong hotel role', async () => {
        // Arrange
        const staffRole = createMockRole({ name: 'hotel_staff' });
        const permissions = [createMockPermission({ name: 'hotel.manage_staff' })];
        const globalRole = createMockRole({ permissions });

        const mockUser = createMockUserWithHotelContext({
          roles: [{ role: globalRole }],
          hotel_roles: [{ hotel_id: 1, role: staffRole }],
        });

        req.user = mockUser;
        req.params = { hotelId: 1 };

        const middleware = requirePermission('hotel.manage_staff', {
          requireHotelContext: true,
          hotelRole: 'hotel_manager', // Requires manager, but user is staff
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'This operation requires hotel_manager role at the hotel.',
        });
      });

      it('should get hotelId from session context', async () => {
        // Arrange
        const permissions = [createMockPermission({ name: 'hotel.manage_staff' })];
        const role = createMockRole({ permissions });
        const hotelRole = createMockRole({ name: 'hotel_manager' });

        const mockUser = createMockUserWithHotelContext({
          roles: [{ role }],
          hotel_roles: [{ hotel_id: 1, role: hotelRole }],
        });

        req.user = mockUser;
        req.params = {};
        req.session = { context: { hotelId: 1 } };

        const middleware = requirePermission('hotel.manage_staff', {
          requireHotelContext: true,
        });

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();
        expect(req.hotelContext.hotelId).toBe(1);
      });
    });

    describe('error handling', () => {
      it('should handle errors gracefully during permission check', async () => {
        // Arrange - Mock Users.findByPk to throw an error
        const mockUser = createMockUserWithContext();
        req.user = mockUser;

        // Force an actual error by making the permission check throw
        Object.defineProperty(req.user, 'roles', {
          get: () => {
            throw new Error('Database connection lost');
          },
        });

        const middleware = requirePermission('hotel.read');

        // Act
        await middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Permission check error.',
        });
      });
    });
  });
});
