const authRepository = require('@repositories/auth.repository');
const { Users, Roles, UserRoles, HotelUsers, AuthAccounts } = require('@models/index.js');

const {
  createMockAuthUser,
  createMockRole,
  createMockUserRole,
} = require('../../fixtures/auth.fixtures');

// Mock the models
jest.mock('@models/index.js', () => ({
  Users: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  Roles: {
    findOne: jest.fn(),
  },
  UserRoles: {
    create: jest.fn(),
  },
  HotelUsers: {},
  AuthAccounts: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

describe('AuthRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmailAndRole', () => {
    it('should find user by email and role successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const roleName = 'guest';
      const mockRole = createMockRole({ name: roleName });
      const mockUser = createMockAuthUser({ email });

      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.findByEmailAndRole(email, roleName);

      // Assert
      expect(Roles.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(Users.findOne).toHaveBeenCalledWith({
        where: { email },
        include: expect.any(Array),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when role not found', async () => {
      // Arrange
      Roles.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmailAndRole('test@example.com', 'invalid_role');

      // Assert
      expect(result).toBeNull();
      expect(Users.findOne).not.toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockRole = createMockRole();
      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmailAndRole('nonexistent@example.com', 'guest');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email with roles', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = createMockAuthUser({ email });
      Users.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.findByEmail(email);

      // Assert
      expect(Users.findOne).toHaveBeenCalledWith({
        where: { email },
        include: expect.arrayContaining([
          expect.objectContaining({
            model: UserRoles,
            as: 'roles',
          }),
        ]),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      Users.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmailOrPhoneAndRole', () => {
    it('should find user by email or phone with role', async () => {
      // Arrange
      const email = 'test@example.com';
      const phoneNumber = '+1234567890';
      const roleName = 'guest';
      const mockRole = createMockRole({ name: roleName });
      const mockUser = createMockAuthUser({ email, phone_number: phoneNumber });

      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.findByEmailOrPhoneAndRole(email, phoneNumber, roleName);

      // Assert
      expect(Roles.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(Users.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when role not found', async () => {
      // Arrange
      Roles.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmailOrPhoneAndRole(
        'test@example.com',
        '+1234567890',
        'invalid_role'
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
        status: 'active',
      };
      const mockCreatedUser = createMockAuthUser(userData);
      Users.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await authRepository.createUser(userData);

      // Assert
      expect(Users.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      // Arrange
      const userId = 1;
      const roleId = 2;
      const mockUserRole = { user_id: userId, role_id: roleId };
      UserRoles.create.mockResolvedValue(mockUserRole);

      // Act
      const result = await authRepository.assignRoleToUser(userId, roleId);

      // Assert
      expect(UserRoles.create).toHaveBeenCalledWith({
        user_id: userId,
        role_id: roleId,
      });
      expect(result).toEqual(mockUserRole);
    });
  });

  describe('findRoleByName', () => {
    it('should find role by name successfully', async () => {
      // Arrange
      const roleName = 'guest';
      const mockRole = createMockRole({ name: roleName });
      Roles.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await authRepository.findRoleByName(roleName);

      // Assert
      expect(Roles.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(result).toEqual(mockRole);
    });

    it('should return null when role not found', async () => {
      // Arrange
      Roles.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findRoleByName('nonexistent_role');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updatePasswordByEmail', () => {
    it('should update password successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const passwordHash = 'newhashedpassword';
      AuthAccounts.update.mockResolvedValue([1]); // [number of updated rows]

      // Act
      const result = await authRepository.updatePasswordByEmail(email, passwordHash);

      // Assert
      expect(AuthAccounts.update).toHaveBeenCalledWith(
        { password_hash: passwordHash },
        {
          where: {
            provider: 'local',
            provider_user_id: email,
          },
        }
      );
      expect(result).toBe(1);
    });

    it('should return 0 when user not found', async () => {
      // Arrange
      AuthAccounts.update.mockResolvedValue([0]);

      // Act
      const result = await authRepository.updatePasswordByEmail(
        'nonexistent@example.com',
        'passwordhash'
      );

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('findByEmailAndRoleWithPassword', () => {
    it('should find user with password hash for login', async () => {
      // Arrange
      const email = 'test@example.com';
      const roleName = 'guest';
      const mockRole = createMockRole({ id: 1, name: roleName });
      const mockUser = {
        id: 1,
        email,
        status: 'active',
        auth_accounts: [
          {
            password_hash: 'hashedpassword',
          },
        ],
        roles: [
          {
            role: { id: 1, name: roleName },
          },
        ],
      };

      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.findByEmailAndRoleWithPassword(email, roleName);

      // Assert
      expect(Roles.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
      });
      expect(Users.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email },
          attributes: ['id', 'email', 'status'],
        })
      );
      expect(result).toEqual({
        id: 1,
        email,
        password_hash: 'hashedpassword',
        status: 'active',
        role: roleName,
      });
    });

    it('should return null when role not found', async () => {
      // Arrange
      Roles.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmailAndRoleWithPassword(
        'test@example.com',
        'invalid_role'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockRole = createMockRole();
      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(null);

      // Act
      const result = await authRepository.findByEmailAndRoleWithPassword(
        'nonexistent@example.com',
        'guest'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user has no roles', async () => {
      // Arrange
      const mockRole = createMockRole();
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        status: 'active',
        auth_accounts: [
          {
            password_hash: 'hashedpassword',
          },
        ],
        roles: [],
      };

      Roles.findOne.mockResolvedValue(mockRole);
      Users.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.findByEmailAndRoleWithPassword(
        'test@example.com',
        'guest'
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      // Arrange
      const userId = 1;
      Users.update.mockResolvedValue([1]);

      // Act
      await authRepository.updateLastLogin(userId);

      // Assert
      expect(Users.update).toHaveBeenCalledWith(
        { last_login_at: expect.any(Date) },
        { where: { id: userId } }
      );
    });
  });

  describe('getUserWithContext', () => {
    it('should get user with roles and hotel context', async () => {
      // Arrange
      const userId = 1;
      const mockUser = createMockAuthUser({ id: userId });
      Users.findByPk.mockResolvedValue(mockUser);

      // Act
      const result = await authRepository.getUserWithContext(userId);

      // Assert
      expect(Users.findByPk).toHaveBeenCalledWith(userId, {
        include: expect.arrayContaining([
          expect.objectContaining({
            model: UserRoles,
            as: 'roles',
          }),
          expect.objectContaining({
            model: HotelUsers,
            as: 'hotel_roles',
          }),
        ]),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      Users.findByPk.mockResolvedValue(null);

      // Act
      const result = await authRepository.getUserWithContext(999);

      // Assert
      expect(result).toBeNull();
    });
  });
});
