jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findByIdForAdmin: jest.fn(),
  updateHotel: jest.fn(),
}));
jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const { auditService } = require('@platform/audit');
const { updateHotel } = require('@modules/catalog/application/admin/updateHotel');

describe('catalog/application/admin/updateHotel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 404 when the hotel does not exist', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue(null);

    await expect(updateHotel('h1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOTEL_NOT_FOUND',
    });
  });

  it('throws 400 when no editable field is provided', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });

    await expect(updateHotel('h1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_HOTEL_CHANGES',
    });
  });

  it('maps input fields to columns, updates and audits', async () => {
    hotelRepository.findByIdForAdmin
      .mockResolvedValueOnce({
        id: 'h1',
        name: 'Old',
        toJSON: () => ({ id: 'h1', name: 'Old' }),
      })
      .mockResolvedValueOnce({ id: 'h1', name: 'New' });
    hotelRepository.updateHotel.mockResolvedValue([1]);

    const result = await updateHotel(
      'h1',
      { name: 'New', minPrice: 120, status: 'active' },
      { actorUserId: 7, requestId: 'req1' }
    );

    expect(hotelRepository.updateHotel).toHaveBeenCalledWith('h1', {
      name: 'New',
      min_price: 120,
      status: 'active',
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'hotel.updated',
        entityType: 'hotel',
        entityId: 'h1',
        hotelId: 'h1',
        actorUserId: 7,
        requestId: 'req1',
      })
    );
    expect(result).toEqual({ hotel: { id: 'h1', name: 'New' } });
  });
});
