const { buildAdminMe } = require('@bff/admin/me.routes');

describe('admin /me payload', () => {
  const user = {
    id: 'user-1',
    email: 'owner@example.com',
    roles: [{ role: { name: 'user', permissions: [{ name: 'booking.read' }] } }],
    hotel_roles: [
      {
        hotel_id: 'hotel-1',
        is_primary_owner: true,
        role: {
          name: 'owner',
          permissions: [{ name: 'room.manage_inventory' }, { name: 'payment.refund' }],
        },
        hotel: { id: 'hotel-1', name: 'Hotel One' },
      },
      {
        hotel_id: 'hotel-2',
        is_primary_owner: false,
        role: { name: 'staff', permissions: [{ name: 'booking.read' }] },
        hotel: { id: 'hotel-2', name: 'Hotel Two' },
      },
    ],
  };

  it('lists managed hotels with role and permissions', () => {
    const me = buildAdminMe(user, { roles: ['user'] });

    expect(me.user).toEqual({ id: 'user-1', email: 'owner@example.com' });
    expect(me.globalRoles).toEqual(['user']);
    expect(me.hotels).toHaveLength(2);
    expect(me.hotels[0]).toMatchObject({
      id: 'hotel-1',
      name: 'Hotel One',
      role: 'owner',
      isPrimaryOwner: true,
    });
    expect(me.hotels[0].permissions).toEqual(['payment.refund', 'room.manage_inventory']);
  });

  it('unions global and hotel permissions', () => {
    const me = buildAdminMe(user, { roles: ['user'] });

    expect(me.permissions).toEqual(['booking.read', 'payment.refund', 'room.manage_inventory']);
  });

  it('handles a user with no hotels', () => {
    const me = buildAdminMe({ id: 'u', email: 'a@b.c', roles: [], hotel_roles: [] }, { roles: [] });

    expect(me.hotels).toEqual([]);
    expect(me.permissions).toEqual([]);
  });
});
