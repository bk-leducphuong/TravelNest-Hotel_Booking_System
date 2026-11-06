jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findByIdForAdmin: jest.fn(),
  findCancellationRulesForAdmin: jest.fn(),
  findCancellationRuleByIdAndHotelId: jest.fn(),
  createCancellationRule: jest.fn(),
  updateCancellationRule: jest.fn(),
  deleteCancellationRule: jest.fn(),
}));

jest.mock('@modules/catalog/infrastructure/room-admin.repository', () => ({
  findByIdAndHotelId: jest.fn(),
}));

jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const roomRepository = require('@modules/catalog/infrastructure/room-admin.repository');
const { auditService } = require('@platform/audit');

const {
  listCancellationRules,
} = require('@modules/catalog/application/admin/listCancellationRules');
const {
  createCancellationRule,
} = require('@modules/catalog/application/admin/createCancellationRule');
const {
  updateCancellationRule,
} = require('@modules/catalog/application/admin/updateCancellationRule');
const {
  deleteCancellationRule,
} = require('@modules/catalog/application/admin/deleteCancellationRule');

describe('catalog/application/admin cancellation rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listCancellationRules 404s for an unknown hotel', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue(null);

    await expect(listCancellationRules('h1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOTEL_NOT_FOUND',
    });
  });

  it('creates a hotel-wide rule (no room) and audits', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });
    hotelRepository.createCancellationRule.mockResolvedValue({
      id: 'rule1',
      toJSON: () => ({ id: 'rule1' }),
    });

    const result = await createCancellationRule(
      'h1',
      { isRefundable: false },
      { actorUserId: 3, requestId: 'rq' }
    );

    expect(hotelRepository.createCancellationRule).toHaveBeenCalledWith({
      hotelId: 'h1',
      isRefundable: false,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancellation_rule.created',
        entityId: 'rule1',
        hotelId: 'h1',
      })
    );
    expect(result.rule.id).toBe('rule1');
  });

  it('rejects a room that does not belong to the hotel', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });
    roomRepository.findByIdAndHotelId.mockResolvedValue(null);

    await expect(createCancellationRule('h1', { roomId: 'r-foreign' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'ROOM_NOT_IN_HOTEL',
    });
  });

  it('updateCancellationRule 404s for an unknown rule', async () => {
    hotelRepository.findCancellationRuleByIdAndHotelId.mockResolvedValue(null);

    await expect(updateCancellationRule('h1', 'rule1', { isActive: false })).rejects.toMatchObject({
      statusCode: 404,
      code: 'CANCELLATION_RULE_NOT_FOUND',
    });
  });

  it('updateCancellationRule maps fields and returns the fresh rule', async () => {
    hotelRepository.findCancellationRuleByIdAndHotelId
      .mockResolvedValueOnce({ id: 'rule1', toJSON: () => ({ id: 'rule1' }) })
      .mockResolvedValueOnce({ id: 'rule1', is_active: false });

    const result = await updateCancellationRule('h1', 'rule1', {
      isActive: false,
      refundPercentAfterDeadline: 50,
    });

    expect(hotelRepository.updateCancellationRule).toHaveBeenCalledWith('rule1', {
      is_active: false,
      refund_percent_after_deadline: 50,
    });
    expect(result).toEqual({ rule: { id: 'rule1', is_active: false } });
  });

  it('updateCancellationRule rejects an empty payload', async () => {
    hotelRepository.findCancellationRuleByIdAndHotelId.mockResolvedValue({ id: 'rule1' });

    await expect(updateCancellationRule('h1', 'rule1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_CANCELLATION_RULE_CHANGES',
    });
  });

  it('deleteCancellationRule removes and audits', async () => {
    hotelRepository.findCancellationRuleByIdAndHotelId.mockResolvedValue({
      id: 'rule1',
      toJSON: () => ({ id: 'rule1' }),
    });

    const result = await deleteCancellationRule('h1', 'rule1', { actorUserId: 2 });

    expect(hotelRepository.deleteCancellationRule).toHaveBeenCalledWith('rule1');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cancellation_rule.deleted', entityId: 'rule1' })
    );
    expect(result).toEqual({ id: 'rule1', deleted: true });
  });
});
