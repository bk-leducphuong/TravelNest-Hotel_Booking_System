jest.mock('@modules/identity/infrastructure/auth.repository', () => ({
  findRoleByName: jest.fn(),
}));

jest.mock('@modules/identity/infrastructure/user.repository', () => ({
  findByEmail: jest.fn(),
}));

jest.mock('@modules/identity/infrastructure/hotel-membership.repository', () => ({
  listByHotel: jest.fn(),
  findByHotelAndUserWithRole: jest.fn(),
  upsertHotelRole: jest.fn(),
  removeHotelRole: jest.fn(),
  countByHotelRoleNames: jest.fn(),
}));

jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const authRepository = require('@modules/identity/infrastructure/auth.repository');
const userRepository = require('@modules/identity/infrastructure/user.repository');
const hotelMembershipRepository = require('@modules/identity/infrastructure/hotel-membership.repository');
const { auditService } = require('@platform/audit');

const { listHotelStaff } = require('@modules/identity/application/admin/listHotelStaff');
const { addHotelStaff } = require('@modules/identity/application/admin/addHotelStaff');
const { updateHotelStaff } = require('@modules/identity/application/admin/updateHotelStaff');
const { removeHotelStaff } = require('@modules/identity/application/admin/removeHotelStaff');

describe('identity/application/admin hotel staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listHotelStaff maps memberships to staff rows', async () => {
    hotelMembershipRepository.listByHotel.mockResolvedValue([
      {
        id: 'm1',
        user_id: 'u1',
        hotel_id: 'h1',
        is_primary_owner: true,
        role: { name: 'owner' },
        user: { email: 'o@x.com', first_name: 'Olive', last_name: 'Owner' },
      },
    ]);

    const result = await listHotelStaff('h1');

    expect(result.staff).toEqual([
      expect.objectContaining({
        id: 'm1',
        userId: 'u1',
        role: 'owner',
        isPrimaryOwner: true,
        email: 'o@x.com',
      }),
    ]);
  });

  it('addHotelStaff 404s when the email has no account', async () => {
    authRepository.findRoleByName.mockResolvedValue({ id: 'role-staff', name: 'staff' });
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      addHotelStaff('h1', { email: 'ghost@x.com', role: 'staff' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('addHotelStaff attaches an existing user and audits', async () => {
    authRepository.findRoleByName.mockResolvedValue({ id: 'role-staff', name: 'staff' });
    userRepository.findByEmail.mockResolvedValue({ id: 'u2', email: 's@x.com' });
    hotelMembershipRepository.upsertHotelRole.mockResolvedValue({ id: 'm2' });

    const result = await addHotelStaff(
      'h1',
      { email: 's@x.com', role: 'staff' },
      { actorUserId: 9, requestId: 'rq' }
    );

    expect(hotelMembershipRepository.upsertHotelRole).toHaveBeenCalledWith({
      userId: 'u2',
      hotelId: 'h1',
      roleId: 'role-staff',
      isPrimaryOwner: false,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hotel.staff_added', entityId: 'm2', hotelId: 'h1' })
    );
    expect(result.staff).toMatchObject({ id: 'm2', userId: 'u2', role: 'staff' });
  });

  it('updateHotelStaff 404s for a non-member', async () => {
    hotelMembershipRepository.findByHotelAndUserWithRole.mockResolvedValue(null);

    await expect(updateHotelStaff('h1', 'u9', { role: 'manager' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOTEL_STAFF_NOT_FOUND',
    });
  });

  it('updateHotelStaff refuses to demote the last owner', async () => {
    hotelMembershipRepository.findByHotelAndUserWithRole.mockResolvedValue({
      id: 'm1',
      is_primary_owner: true,
      role: { name: 'owner' },
    });
    authRepository.findRoleByName.mockResolvedValue({ id: 'role-manager', name: 'manager' });
    hotelMembershipRepository.countByHotelRoleNames.mockResolvedValue(1);

    await expect(updateHotelStaff('h1', 'u1', { role: 'manager' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'LAST_OWNER',
    });
  });

  it('updateHotelStaff changes the role when another owner remains', async () => {
    hotelMembershipRepository.findByHotelAndUserWithRole.mockResolvedValue({
      id: 'm1',
      is_primary_owner: false,
      role: { name: 'owner' },
    });
    authRepository.findRoleByName.mockResolvedValue({ id: 'role-manager', name: 'manager' });
    hotelMembershipRepository.countByHotelRoleNames.mockResolvedValue(2);

    const result = await updateHotelStaff('h1', 'u1', { role: 'manager' });

    expect(hotelMembershipRepository.upsertHotelRole).toHaveBeenCalledWith({
      userId: 'u1',
      hotelId: 'h1',
      roleId: 'role-manager',
      isPrimaryOwner: false,
    });
    expect(result.staff).toMatchObject({ userId: 'u1', role: 'manager' });
  });

  it('removeHotelStaff refuses to remove the last owner', async () => {
    hotelMembershipRepository.findByHotelAndUserWithRole.mockResolvedValue({
      id: 'm1',
      role: { name: 'owner' },
    });
    hotelMembershipRepository.countByHotelRoleNames.mockResolvedValue(1);

    await expect(removeHotelStaff('h1', 'u1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'LAST_OWNER',
    });
    expect(hotelMembershipRepository.removeHotelRole).not.toHaveBeenCalled();
  });

  it('removeHotelStaff deletes a non-owner and audits', async () => {
    hotelMembershipRepository.findByHotelAndUserWithRole.mockResolvedValue({
      id: 'm2',
      role: { name: 'staff' },
    });

    const result = await removeHotelStaff('h1', 'u2', { actorUserId: 4 });

    expect(hotelMembershipRepository.removeHotelRole).toHaveBeenCalledWith('u2', 'h1');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hotel.staff_removed', entityId: 'm2' })
    );
    expect(result).toEqual({ id: 'm2', userId: 'u2', deleted: true });
  });
});
