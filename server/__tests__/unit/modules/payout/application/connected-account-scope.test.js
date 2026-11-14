jest.mock('@platform/database', () => ({
  HotelUsers: { findOne: jest.fn() },
  Roles: {},
}));

const { HotelUsers } = require('@platform/database');
const {
  resolveConnectedAccountScope,
  resolveCreateConnectedAccountScope,
} = require('@modules/payout/application/admin/connected-account-scope');

describe('payout/application/connected-account-scope', () => {
  const nonStaff = {
    actorUserId: 'user-1',
    actorHotelId: 'hotel-1',
    isPlatformStaff: false,
  };

  beforeEach(() => {
    HotelUsers.findOne.mockResolvedValue({
      id: 'membership-1',
      hotel_id: 'hotel-1',
      user_id: 'owner-1',
      is_primary_owner: true,
    });
  });

  it('rejects a foreign hotel filter for a hotel-scoped caller', async () => {
    await expect(
      resolveConnectedAccountScope({ ...nonStaff, hotelId: 'hotel-2' })
    ).rejects.toMatchObject({ code: 'RESOURCE_ACCESS_DENIED' });
  });

  it('rejects reading another owner without a hotel context', async () => {
    await expect(
      resolveConnectedAccountScope({
        ...nonStaff,
        actorHotelId: null,
        ownerId: 'owner-2',
      })
    ).rejects.toMatchObject({ code: 'OWNER_SCOPE_DENIED' });
    expect(HotelUsers.findOne).not.toHaveBeenCalled();
  });

  it('rejects an owner who does not belong to the hotel', async () => {
    HotelUsers.findOne.mockResolvedValue(null);

    await expect(
      resolveConnectedAccountScope({ ...nonStaff, ownerId: 'owner-2' })
    ).rejects.toMatchObject({ code: 'OWNER_NOT_IN_HOTEL' });
  });

  it('accepts an owner who belongs to the hotel', async () => {
    await expect(
      resolveConnectedAccountScope({ ...nonStaff, ownerId: 'owner-1' })
    ).resolves.toEqual({ hotelId: 'hotel-1', ownerId: 'owner-1' });
  });

  it('rejects creating an account for a foreign hotel', async () => {
    await expect(
      resolveCreateConnectedAccountScope({ ...nonStaff, hotelId: 'hotel-2', ownerId: 'owner-1' })
    ).rejects.toMatchObject({ code: 'RESOURCE_ACCESS_DENIED' });
  });

  it('requires self-service callers without a hotel context to be an owner', async () => {
    HotelUsers.findOne.mockResolvedValue(null);

    await expect(
      resolveCreateConnectedAccountScope({
        ...nonStaff,
        actorHotelId: null,
        ownerId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'OWNER_ROLE_REQUIRED' });
  });

  it('allows platform staff to create for an owner in a hotel', async () => {
    await expect(
      resolveCreateConnectedAccountScope({
        actorUserId: 'admin-1',
        actorHotelId: null,
        isPlatformStaff: true,
        hotelId: 'hotel-1',
        ownerId: 'owner-1',
      })
    ).resolves.toEqual({ hotelId: 'hotel-1' });
  });
});
