jest.mock('@config/database.config', () => ({
  transaction: jest.fn(async (cb) => cb('tx')),
}));

jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));
jest.mock('@platform/events', () => ({
  publish: jest.fn(),
  DOMAIN_EVENTS: { BOOKING_CREATED: 'booking.created' },
}));

jest.mock('@modules/inventory', () => ({
  checkAvailability: jest.fn(),
  reserveRooms: jest.fn(),
}));

jest.mock('@modules/catalog', () => ({
  getRoomForHotel: jest.fn(),
}));

jest.mock('@modules/identity', () => ({
  findUserByEmail: jest.fn(),
}));

jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  create: jest.fn(),
  bulkCreateBookingRooms: jest.fn(),
}));

jest.mock('@modules/booking/infrastructure/booking-admin.repository', () => ({
  findByIdWithRelations: jest.fn(),
}));

jest.mock('@modules/booking/application/pricing.service', () => ({
  quote: jest.fn(),
}));

jest.mock('@modules/booking/domain/booking-code', () => ({
  generateBookingCode: jest.fn(() => 'TN-TEST-1'),
}));

const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');
const { publish } = require('@platform/events');
const inventory = require('@modules/inventory');
const catalog = require('@modules/catalog');
const identity = require('@modules/identity');
const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const bookingAdminRepository = require('@modules/booking/infrastructure/booking-admin.repository');
const pricingService = require('@modules/booking/application/pricing.service');

const { createManualBooking } = require('@modules/booking/application/admin/createManualBooking');

const quote = {
  subtotal: 200,
  taxAmount: 20,
  serviceFeeAmount: 0,
  platformCommissionAmount: 0,
  totalPrice: 220,
  currency: 'USD',
  rooms: [
    {
      roomId: 'r1',
      quantity: 1,
      nightly: [{ date: '2026-11-01', price: 100 }],
      subtotal: 200,
      totalPrice: 200,
    },
  ],
  cancellationPolicy: { rooms: [] },
};

describe('booking/application/admin/createManualBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (cb) => cb('tx'));
  });

  it('rejects a room that is not in the hotel', async () => {
    catalog.getRoomForHotel.mockResolvedValue(null);

    await expect(
      createManualBooking('h1', {
        roomId: 'r1',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-03',
        buyerId: 'u1',
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'ROOM_NOT_IN_HOTEL' });
  });

  it('404s when the guest email has no account', async () => {
    catalog.getRoomForHotel.mockResolvedValue({ id: 'r1' });
    identity.findUserByEmail.mockResolvedValue(null);

    await expect(
      createManualBooking('h1', {
        roomId: 'r1',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-03',
        guestEmail: 'ghost@x.com',
      })
    ).rejects.toMatchObject({ statusCode: 404, code: 'BUYER_NOT_FOUND' });
  });

  it('409s when the room is unavailable', async () => {
    catalog.getRoomForHotel.mockResolvedValue({ id: 'r1' });
    inventory.checkAvailability.mockResolvedValue(false);

    await expect(
      createManualBooking('h1', {
        roomId: 'r1',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-03',
        buyerId: 'u1',
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'ROOM_NOT_AVAILABLE' });
  });

  it('reserves inventory, creates a confirmed booking and audits', async () => {
    catalog.getRoomForHotel.mockResolvedValue({ id: 'r1' });
    inventory.checkAvailability.mockResolvedValue(true);
    pricingService.quote.mockResolvedValue(quote);
    bookingRepository.create.mockResolvedValue({ id: 'b1', booking_code: 'TN-TEST-1' });
    bookingRepository.bulkCreateBookingRooms.mockResolvedValue([]);
    bookingAdminRepository.findByIdWithRelations.mockResolvedValue({
      id: 'b1',
      status: 'confirmed',
    });

    const result = await createManualBooking(
      'h1',
      {
        roomId: 'r1',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-03',
        buyerId: 'u1',
        quantity: 1,
        numberOfGuests: 2,
      },
      { actorUserId: 7, requestId: 'req1' }
    );

    expect(inventory.reserveRooms).toHaveBeenCalledWith(
      {
        bookedRooms: [{ room_id: 'r1', roomQuantity: 1 }],
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-03',
      },
      { transaction: 'tx' }
    );
    expect(bookingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyer_id: 'u1',
        hotel_id: 'h1',
        room_id: 'r1',
        status: 'confirmed',
        total_price: 220,
      }),
      { transaction: 'tx' }
    );
    expect(bookingRepository.bulkCreateBookingRooms).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'booking.created_manual', entityId: 'b1', hotelId: 'h1' })
    );
    expect(publish).toHaveBeenCalledWith(
      'booking.created',
      expect.objectContaining({ bookingId: 'b1' })
    );
    expect(result).toEqual({ booking: { id: 'b1', status: 'confirmed' } });
  });

  it('applies a manual total price override', async () => {
    catalog.getRoomForHotel.mockResolvedValue({ id: 'r1' });
    inventory.checkAvailability.mockResolvedValue(true);
    pricingService.quote.mockResolvedValue(quote);
    bookingRepository.create.mockResolvedValue({ id: 'b1' });
    bookingAdminRepository.findByIdWithRelations.mockResolvedValue({ id: 'b1' });

    await createManualBooking('h1', {
      roomId: 'r1',
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-03',
      buyerId: 'u1',
      totalPrice: 150,
    });

    expect(bookingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ total_price: 150 }),
      { transaction: 'tx' }
    );
  });
});
