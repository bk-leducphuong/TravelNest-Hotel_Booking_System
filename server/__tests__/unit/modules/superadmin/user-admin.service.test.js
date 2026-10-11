jest.mock('@modules/superadmin/infrastructure/superadmin.repository', () => ({
  listUsers: jest.fn(),
  findGlobalRolesByUserIds: jest.fn(),
  findUserById: jest.fn(),
  findUserGlobalRoles: jest.fn(),
  findUserHotelMemberships: jest.fn(),
  getBookingCountForUser: jest.fn(),
}));

const repository = require('@modules/superadmin/infrastructure/superadmin.repository');
const { listUsers, getUser } = require('@modules/superadmin/application/user-admin.service');
const ApiError = require('@utils/ApiError');

function userRow(overrides = {}) {
  return {
    id: 'u1',
    toJSON: () => ({
      id: 'u1',
      email: 'jane.doe@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      phone_number: '+12025550123',
      address: '123 Main St',
      date_of_birth: '1990-01-01',
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
      last_login_at: '2024-06-01T00:00:00.000Z',
      email_verified_at: '2024-01-02T00:00:00.000Z',
      ...overrides,
    }),
  };
}

describe('user-admin.service', () => {
  describe('listUsers', () => {
    it('masks PII by default and includes global roles', async () => {
      repository.listUsers.mockResolvedValue({ rows: [userRow()], count: 1 });
      repository.findGlobalRolesByUserIds.mockResolvedValue(new Map([['u1', ['user']]]));

      const result = await listUsers({}, {});

      expect(result.total).toBe(1);
      expect(result.users[0].email).toBe('ja•••@example.com');
      expect(result.users[0].phoneNumber).toBe('•••23');
      expect(result.users[0].globalRoles).toEqual(['user']);
      expect(result.users[0].fullName).toBe('Jane Doe');
    });

    it('unmasks PII when unmaskPii is true', async () => {
      repository.listUsers.mockResolvedValue({ rows: [userRow()], count: 1 });
      repository.findGlobalRolesByUserIds.mockResolvedValue(new Map());

      const result = await listUsers({}, { unmaskPii: true });

      expect(result.users[0].email).toBe('jane.doe@example.com');
      expect(result.users[0].phoneNumber).toBe('+12025550123');
    });
  });

  describe('getUser', () => {
    it('throws 404 when the user is missing', async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(getUser('missing', {})).rejects.toBeInstanceOf(ApiError);
    });

    it('returns masked profile, roles, memberships and booking count', async () => {
      repository.findUserById.mockResolvedValue(userRow());
      repository.findUserGlobalRoles.mockResolvedValue([
        { id: 'r1', name: 'user', description: 'Registered user' },
      ]);
      repository.findUserHotelMemberships.mockResolvedValue([
        {
          hotel_id: 'h1',
          is_primary_owner: true,
          hotel: { id: 'h1', name: 'Grand Hotel', status: 'active' },
          role: { name: 'owner' },
        },
      ]);
      repository.getBookingCountForUser.mockResolvedValue(3);

      const result = await getUser('u1', {});

      expect(result.email).toBe('ja•••@example.com');
      expect(result.address).toBe('•••');
      expect(result.globalRoles).toEqual(['user']);
      expect(result.memberships).toEqual([
        {
          hotelId: 'h1',
          hotelName: 'Grand Hotel',
          hotelStatus: 'active',
          role: 'owner',
          isPrimaryOwner: true,
        },
      ]);
      expect(result.bookings).toEqual({ total: 3 });
    });
  });
});
