const userService = require('@modules/identity/application/user.service');
const userRepository = require('@modules/identity/infrastructure/user.repository');
const ApiError = require('@utils/ApiError');

jest.mock('@modules/identity/infrastructure/user.repository', () => ({
  findById: jest.fn(),
  findByIdWithPassword: jest.fn(),
  findByEmail: jest.fn(),
  updateById: jest.fn(),
  findFavoriteHotelsByUserIdPaginated: jest.fn(),
  findHotelById: jest.fn(),
  findSavedHotel: jest.fn(),
  createSavedHotel: jest.fn(),
  deleteSavedHotel: jest.fn(),
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserInformation', () => {
    it('returns profile_picture_url when present on the user record', async () => {
      const mockUser = {
        full_name: 'Jane Doe',
        toJSON: jest.fn().mockReturnValue({
          id: 'user-1',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          profile_picture_url: 'https://cdn.example.com/avatar.jpg',
          roles: [
            {
              role: {
                name: 'guest',
              },
            },
          ],
        }),
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserInformation('user-1');

      expect(result.profile_picture_url).toBe('https://cdn.example.com/avatar.jpg');
      expect(result.user_role).toBe('guest');
      expect(result.roles).toEqual(['guest']);
    });

    it('throws when the user cannot be found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserInformation('missing-user')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
      await expect(userService.getUserInformation('missing-user')).rejects.toThrow(ApiError);
    });
  });
});
