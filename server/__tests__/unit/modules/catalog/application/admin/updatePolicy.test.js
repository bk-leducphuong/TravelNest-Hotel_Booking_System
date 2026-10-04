jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findByIdForAdmin: jest.fn(),
  findPolicyByIdAndHotelId: jest.fn(),
  updatePolicy: jest.fn(),
}));
jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const { auditService } = require('@platform/audit');
const { updatePolicy } = require('@modules/catalog/application/admin/updatePolicy');

describe('catalog/application/admin/updatePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 404 when the policy does not belong to the hotel', async () => {
    hotelRepository.findPolicyByIdAndHotelId.mockResolvedValue(null);

    await expect(updatePolicy('h1', 'p1', { title: 'X' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'POLICY_NOT_FOUND',
    });
  });

  it('throws 400 when no editable field is provided', async () => {
    hotelRepository.findPolicyByIdAndHotelId.mockResolvedValue({ id: 'p1' });

    await expect(updatePolicy('h1', 'p1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_POLICY_CHANGES',
    });
  });

  it('maps fields, updates and audits', async () => {
    hotelRepository.findPolicyByIdAndHotelId
      .mockResolvedValueOnce({ id: 'p1', title: 'Old', toJSON: () => ({ id: 'p1' }) })
      .mockResolvedValueOnce({ id: 'p1', title: 'New' });
    hotelRepository.updatePolicy.mockResolvedValue([1]);

    const result = await updatePolicy(
      'h1',
      'p1',
      { title: 'New', displayOrder: 3, isActive: false },
      { actorUserId: 7, requestId: 'req1' }
    );

    expect(hotelRepository.updatePolicy).toHaveBeenCalledWith('p1', {
      title: 'New',
      display_order: 3,
      is_active: false,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'policy.updated',
        entityType: 'hotel_policy',
        entityId: 'p1',
        hotelId: 'h1',
        actorUserId: 7,
        requestId: 'req1',
      })
    );
    expect(result).toEqual({ policy: { id: 'p1', title: 'New' } });
  });
});
