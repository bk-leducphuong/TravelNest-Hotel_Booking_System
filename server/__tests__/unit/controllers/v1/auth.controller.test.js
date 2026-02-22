const authController = require('@controllers/v1/auth.controller');
const authService = require('@services/auth.service');
const ApiError = require('@utils/ApiError');
const {
  createMockUserWithContext,
  createMockLoginCredentials,
  createMockRegistrationData,
  createMockSession,
} = require('../../../fixtures/auth.fixtures');

// Mock dependencies
jest.mock('@services/auth.service');
jest.mock('@helpers/session.helper', () => ({
  buildSession: jest.fn((sessionId, userData) => ({
    sessionId,
    user: userData,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  })),
}));

const { buildSession } = require('@helpers/session.helper');

describe('AuthController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('checkAuth', () => {
    it('should return session with authenticated user', async () => {
      // Arrange
      const mockUser = createMockUserWithContext();
      req.sessionID = 'session-123';
      req.session = { userData: mockUser };

      const mockSession = {
        sessionId: 'session-123',
        user: mockUser,
        expiresAt: new Date().toISOString(),
      };
      buildSession.mockReturnValue(mockSession);

      // Act
      await authController.checkAuth(req, res, next);

      // Assert
      expect(buildSession).toHaveBeenCalledWith('session-123', mockUser);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session: mockSession,
          isAuthenticated: true,
        },
      });
    });

    it('should return session with null user when not authenticated', async () => {
      // Arrange
      req.sessionID = 'session-123';
      req.session = {};

      const mockSession = {
        sessionId: 'session-123',
        user: null,
        expiresAt: new Date().toISOString(),
      };
      buildSession.mockReturnValue(mockSession);

      // Act
      await authController.checkAuth(req, res, next);

      // Assert
      expect(buildSession).toHaveBeenCalledWith('session-123', null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session: mockSession,
          isAuthenticated: false,
        },
      });
    });
  });

  describe('checkEmail', () => {
    it('should return exists: true when email exists', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        userRole: 'guest',
      };

      authService.checkEmail.mockResolvedValue({ exists: true });

      // Act
      await authController.checkEmail(req, res, next);

      // Assert
      expect(authService.checkEmail).toHaveBeenCalledWith(
        'test@example.com',
        'guest'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: { exists: true },
      });
    });

    it('should return exists: false when email does not exist', async () => {
      // Arrange
      req.body = {
        email: 'newuser@example.com',
        userRole: 'guest',
      };

      authService.checkEmail.mockResolvedValue({ exists: false });

      // Act
      await authController.checkEmail(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        data: { exists: false },
      });
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      req.body = {
        email: 'invalid@example.com',
        userRole: 'guest',
      };

      const error = new ApiError(400, 'INVALID_EMAIL', 'Invalid email');
      authService.checkEmail.mockRejectedValue(error);

      // Act
      await authController.checkEmail(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully and create session', async () => {
      // Arrange
      const credentials = createMockLoginCredentials();
      const mockUser = createMockUserWithContext();
      req.body = credentials;
      req.sessionID = 'session-123';
      req.session = { userData: null };

      const sessionData = {
        userId: mockUser.id,
        userRole: 'guest',
        userData: mockUser,
      };

      const mockSession = {
        sessionId: 'session-123',
        user: mockUser,
        expiresAt: new Date().toISOString(),
      };

      authService.login.mockResolvedValue(sessionData);
      buildSession.mockReturnValue(mockSession);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
        credentials.userRole
      );
      expect(req.session.userData).toEqual(mockUser);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session: mockSession,
          message: 'Logged in successfully',
        },
      });
    });

    it('should call next with error when credentials are invalid', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
        userRole: 'guest',
      };

      const error = new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
      authService.login.mockRejectedValue(error);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next with error when account is inactive', async () => {
      // Arrange
      req.body = createMockLoginCredentials();

      const error = new ApiError(
        403,
        'ACCOUNT_INACTIVE',
        'Account is suspended'
      );
      authService.login.mockRejectedValue(error);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'ACCOUNT_INACTIVE',
        })
      );
    });
  });

  describe('logout', () => {
    it('should destroy session and clear cookie successfully', () => {
      // Arrange
      req.session = {
        destroy: jest.fn((callback) => callback(null)),
      };

      // Act
      authController.logout(req, res);

      // Assert
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return error when session destruction fails', () => {
      // Arrange
      const error = new Error('Session destruction failed');
      req.session = {
        destroy: jest.fn((callback) => callback(error)),
      };

      // Act
      authController.logout(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
        },
      });
    });
  });

  describe('register', () => {
    it('should register new user successfully and create session', async () => {
      // Arrange
      const registrationData = createMockRegistrationData();
      const mockUser = createMockUserWithContext();
      req.body = registrationData;
      req.sessionID = 'session-123';
      req.session = { userData: null };

      const userData = {
        userId: mockUser.id,
        userRole: 'guest',
        userData: mockUser,
      };

      const mockSession = {
        sessionId: 'session-123',
        user: mockUser,
        expiresAt: new Date().toISOString(),
      };

      authService.register.mockResolvedValue(userData);
      buildSession.mockReturnValue(mockSession);

      // Act
      await authController.register(req, res, next);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(
        registrationData.email,
        registrationData.password,
        registrationData.firstName,
        registrationData.lastName,
        registrationData.userRole
      );
      expect(req.session.userData).toEqual(mockUser);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          session: mockSession,
          message: 'User registered successfully',
        },
      });
    });

    it('should call next with error when user already exists', async () => {
      // Arrange
      req.body = createMockRegistrationData({
        email: 'existing@example.com',
      });

      const error = new ApiError(
        409,
        'USER_ALREADY_EXISTS',
        'User already exists'
      );
      authService.register.mockRejectedValue(error);

      // Act
      await authController.register(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          code: 'USER_ALREADY_EXISTS',
        })
      );
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next with error when validation fails', async () => {
      // Arrange
      req.body = createMockRegistrationData();

      const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
      authService.register.mockRejectedValue(error);

      // Act
      await authController.register(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
