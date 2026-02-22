const authService = require('@services/auth.service');
const authRepository = require('@repositories/auth.repository');
const bcrypt = require('bcryptjs');
const ApiError = require('@utils/ApiError');
const {
  createMockAuthUser,
  createMockRole,
  createMockUserWithContext,
  createHashedPassword,
} = require('../../fixtures/auth.fixtures');

// Mock dependencies
jest.mock('@repositories/auth.repository');
jest.mock('bcryptjs');
jest.mock('@constants/roles', () => ({
  isValidRole: jest.fn(),
}));
jest.mock('@utils/emailValidation.js', () => ({
  isValidEmailFormat: jest.fn(),
  validateEmail: jest.fn(),
  validateEmailDomain: jest.fn(),
}));

const { isValidRole } = require('@constants/roles');
const {
  isValidEmailFormat,
  validateEmail,
  validateEmailDomain,
} = require('@utils/emailValidation.js');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEmail', () => {
    it('should return exists: true when user with email and role exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const roleName = 'guest';
      const mockUser = createMockAuthUser({ email });

      isValidRole.mockReturnValue(true);
      isValidEmailFormat.mockReturnValue(true);
      validateEmailDomain.mockResolvedValue(true);
      authRepository.findByEmailAndRole.mockResolvedValue(mockUser);

      // Act
      const result = await authService.checkEmail(email, roleName);

      // Assert
      expect(result).toEqual({ exists: true });
      expect(authRepository.findByEmailAndRole).toHaveBeenCalledWith(
        email,
        roleName
      );
      expect(validateEmail).not.toHaveBeenCalled(); // Should not check if user exists
    });

    it('should return exists: false when user does not exist but email is valid', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const roleName = 'guest';

      isValidRole.mockReturnValue(true);
      isValidEmailFormat.mockReturnValue(true);
      validateEmailDomain.mockResolvedValue(true);
      authRepository.findByEmailAndRole.mockResolvedValue(null);
      validateEmail.mockResolvedValue(true);

      // Act
      const result = await authService.checkEmail(email, roleName);

      // Assert
      expect(result).toEqual({ exists: false });
      expect(validateEmail).toHaveBeenCalledWith(email);
    });

    it('should throw error for invalid role', async () => {
      // Arrange
      isValidRole.mockReturnValue(false);

      // Act & Assert
      await expect(
        authService.checkEmail('test@example.com', 'invalid_role')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.checkEmail('test@example.com', 'invalid_role')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_ROLE',
      });
    });

    it('should throw error for invalid email format', async () => {
      // Arrange
      isValidRole.mockReturnValue(true);
      isValidEmailFormat.mockReturnValue(false);

      // Act & Assert
      await expect(
        authService.checkEmail('invalid-email', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.checkEmail('invalid-email', 'guest')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_EMAIL_FORMAT',
      });
    });

    it('should throw error for invalid email domain', async () => {
      // Arrange
      isValidRole.mockReturnValue(true);
      isValidEmailFormat.mockReturnValue(true);
      validateEmailDomain.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.checkEmail('test@invaliddomain.com', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.checkEmail('test@invaliddomain.com', 'guest')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_EMAIL_DOMAIN',
      });
    });

    it('should throw error when email does not exist', async () => {
      // Arrange
      isValidRole.mockReturnValue(true);
      isValidEmailFormat.mockReturnValue(true);
      validateEmailDomain.mockResolvedValue(true);
      authRepository.findByEmailAndRole.mockResolvedValue(null);
      validateEmail.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.checkEmail('nonexistent@example.com', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.checkEmail('nonexistent@example.com', 'guest')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMAIL_NOT_EXISTS',
      });
    });
  });

  describe('login', () => {
    it('should login user successfully with correct credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const roleName = 'guest';
      const hashedPassword = await createHashedPassword(password);

      const mockUser = {
        id: 1,
        email,
        password_hash: hashedPassword,
        status: 'active',
        role: roleName,
      };

      const mockUserContext = createMockUserWithContext({ id: 1, email });

      isValidRole.mockReturnValue(true);
      authRepository.findByEmailAndRoleWithPassword.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      authRepository.updateLastLogin.mockResolvedValue(undefined);
      authRepository.getUserWithContext.mockResolvedValue(mockUserContext);

      // Act
      const result = await authService.login(email, password, roleName);

      // Assert
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('userRole', roleName);
      expect(result).toHaveProperty('userData');
      expect(authRepository.updateLastLogin).toHaveBeenCalledWith(1);
      expect(authRepository.getUserWithContext).toHaveBeenCalledWith(1);
    });

    it('should throw error for invalid role during login', async () => {
      // Arrange
      isValidRole.mockReturnValue(false);

      // Act & Assert
      await expect(
        authService.login('test@example.com', 'password123', 'invalid_role')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.login('test@example.com', 'password123', 'invalid_role')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_ROLE',
      });
    });

    it('should throw error when user not found', async () => {
      // Arrange
      isValidRole.mockReturnValue(true);
      authRepository.findByEmailAndRoleWithPassword.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login('nonexistent@example.com', 'password123', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.login('nonexistent@example.com', 'password123', 'guest')
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    it('should throw error when user account is inactive', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        status: 'suspended',
        role: 'guest',
      };

      isValidRole.mockReturnValue(true);
      authRepository.findByEmailAndRoleWithPassword.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.login('test@example.com', 'password123', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.login('test@example.com', 'password123', 'guest')
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is suspended. Please contact support.',
      });
    });

    it('should throw error when password does not match', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        status: 'active',
        role: 'guest',
      };

      isValidRole.mockReturnValue(true);
      authRepository.findByEmailAndRoleWithPassword.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login('test@example.com', 'wrongpassword', 'guest')
      ).rejects.toThrow(ApiError);

      await expect(
        authService.login('test@example.com', 'wrongpassword', 'guest')
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'StrongPassword123!';
      const firstName = 'John';
      const lastName = 'Doe';
      const roleName = 'guest';
      const hashedPassword = 'hashedpassword';

      const mockRole = createMockRole({ id: 1, name: roleName });
      const mockNewUser = createMockAuthUser({
        id: 1,
        email,
        first_name: firstName,
        last_name: lastName,
      });
      const mockUserContext = createMockUserWithContext({ id: 1, email });

      isValidRole.mockReturnValue(true);
      authRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      authRepository.findRoleByName.mockResolvedValue(mockRole);
      authRepository.createUser.mockResolvedValue(mockNewUser);
      authRepository.assignRoleToUser.mockResolvedValue(undefined);
      authRepository.getUserWithContext.mockResolvedValue(mockUserContext);

      // Act
      const result = await authService.register(
        email,
        password,
        firstName,
        lastName,
        roleName
      );

      // Assert
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('userRole', roleName);
      expect(result).toHaveProperty('userData');
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(authRepository.createUser).toHaveBeenCalledWith({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        status: 'active',
      });
      expect(authRepository.assignRoleToUser).toHaveBeenCalledWith(1, 1);
    });

    it('should throw error for invalid role during registration', async () => {
      // Arrange
      isValidRole.mockReturnValue(false);

      // Act & Assert
      await expect(
        authService.register(
          'test@example.com',
          'password',
          'John',
          'Doe',
          'invalid_role'
        )
      ).rejects.toThrow(ApiError);

      await expect(
        authService.register(
          'test@example.com',
          'password',
          'John',
          'Doe',
          'invalid_role'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_ROLE',
      });
    });

    it('should throw error when user already exists with same role', async () => {
      // Arrange
      const roleName = 'guest';
      const existingUser = createMockAuthUser({
        email: 'existing@example.com',
        roles: [{ role: { name: roleName } }],
      });

      isValidRole.mockReturnValue(true);
      authRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        authService.register(
          'existing@example.com',
          'password',
          'John',
          'Doe',
          roleName
        )
      ).rejects.toThrow(ApiError);

      await expect(
        authService.register(
          'existing@example.com',
          'password',
          'John',
          'Doe',
          roleName
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'USER_ALREADY_EXISTS',
      });
    });

    it('should assign additional role when user exists but without that role', async () => {
      // Arrange
      const roleName = 'hotel_manager';
      const existingUser = createMockAuthUser({
        id: 1,
        email: 'existing@example.com',
        roles: [{ role: { name: 'guest' } }],
      });

      const mockRole = createMockRole({ id: 2, name: roleName });
      const mockUserContext = createMockUserWithContext({ id: 1 });

      isValidRole.mockReturnValue(true);
      authRepository.findByEmail.mockResolvedValue(existingUser);
      authRepository.findRoleByName.mockResolvedValue(mockRole);
      authRepository.assignRoleToUser.mockResolvedValue(undefined);
      authRepository.getUserWithContext.mockResolvedValue(mockUserContext);

      // Act
      const result = await authService.register(
        'existing@example.com',
        'password',
        'John',
        'Doe',
        roleName
      );

      // Assert
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('userRole', roleName);
      expect(authRepository.assignRoleToUser).toHaveBeenCalledWith(1, 2);
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw error when role not found in system', async () => {
      // Arrange
      isValidRole.mockReturnValue(true);
      authRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedpassword');
      authRepository.findRoleByName.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.register(
          'test@example.com',
          'password',
          'John',
          'Doe',
          'guest'
        )
      ).rejects.toThrow(ApiError);

      await expect(
        authService.register(
          'test@example.com',
          'password',
          'John',
          'Doe',
          'guest'
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'ROLE_NOT_FOUND',
        message: 'Role not found in system',
      });
    });
  });
});
