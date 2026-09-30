jest.mock('@repositories/notification.repository', () => ({
  createFromTemplate: jest.fn(),
  markAsSentById: jest.fn(),
}));
jest.mock('@modules/notification/infrastructure/lookups', () => ({
  getHotelWithOwner: jest.fn(),
}));
jest.mock('@modules/notification/infrastructure/socket-emitter', () => ({
  emitNotification: jest.fn(),
}));

const notificationRepository = require('@repositories/notification.repository');
const { getHotelWithOwner } = require('@modules/notification/infrastructure/lookups');
const { emitNotification } = require('@modules/notification/infrastructure/socket-emitter');
const {
  sendPayoutNotification,
} = require('@modules/notification/application/sendPayoutNotification');

function mockNotification(id) {
  return { id, toPublicJSON: () => ({ id }) };
}

describe('notification/application/sendPayoutNotification', () => {
  it('notifies an explicit owner and emits the payout update', async () => {
    const notification = mockNotification(5);
    notificationRepository.createFromTemplate.mockResolvedValue(notification);
    notificationRepository.markAsSentById.mockResolvedValue(undefined);

    const result = await sendPayoutNotification({
      hotelId: 'h1',
      ownerId: 42,
      payoutId: 'p1',
      status: 'completed',
      amount: 100,
    });

    expect(getHotelWithOwner).not.toHaveBeenCalled();
    expect(notificationRepository.createFromTemplate).toHaveBeenCalledWith(
      42,
      expect.any(String),
      expect.objectContaining({ payoutId: 'p1', amount: 100, currency: 'USD' }),
      expect.objectContaining({ relatedEntityId: 'p1' })
    );
    expect(emitNotification).toHaveBeenCalledWith('owner_42', 'payout:update', { id: 5 });
    expect(notificationRepository.markAsSentById).toHaveBeenCalledWith(5);
    expect(result).toBe(notification);
  });

  it('resolves the owner from the hotel when no ownerId is given', async () => {
    getHotelWithOwner.mockResolvedValue({ id: 'h1', hotel_owner_id: 9 });
    notificationRepository.createFromTemplate.mockResolvedValue(mockNotification(6));
    notificationRepository.markAsSentById.mockResolvedValue(undefined);

    await sendPayoutNotification({ hotelId: 'h1', payoutId: 'p2', status: 'failed', amount: 5 });

    expect(getHotelWithOwner).toHaveBeenCalledWith('h1');
    expect(emitNotification).toHaveBeenCalledWith('owner_9', 'payout:update', { id: 6 });
  });

  it('returns null when the hotel has no owner', async () => {
    getHotelWithOwner.mockResolvedValue(null);

    await expect(
      sendPayoutNotification({ hotelId: 'h1', status: 'completed' })
    ).resolves.toBeNull();
    expect(notificationRepository.createFromTemplate).not.toHaveBeenCalled();
  });
});
