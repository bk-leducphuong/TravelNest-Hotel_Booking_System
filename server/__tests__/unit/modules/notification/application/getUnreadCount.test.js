jest.mock('@modules/notification/infrastructure/notification-service.client', () => ({
  notificationServiceClient: { getUnreadCount: jest.fn(), getNotifications: jest.fn() },
}));
jest.mock('@repositories/notification.repository', () => ({ countByCategory: jest.fn() }));

const {
  notificationServiceClient,
} = require('@modules/notification/infrastructure/notification-service.client');
const notificationRepository = require('@repositories/notification.repository');
const { getUnreadCount } = require('@modules/notification/application/getUnreadCount');
const { getNotifications } = require('@modules/notification/application/getNotifications');

describe('notification/application/getUnreadCount', () => {
  it('asks the notification service by default and returns its count', async () => {
    notificationServiceClient.getUnreadCount.mockResolvedValue({ unreadCount: 7 });

    await expect(getUnreadCount('u1')).resolves.toBe(7);
    expect(notificationServiceClient.getUnreadCount).toHaveBeenCalledWith('u1');
    expect(notificationRepository.countByCategory).not.toHaveBeenCalled();
  });

  it('returns the per-category breakdown from the repository when asked', async () => {
    const breakdown = { booking: 2 };
    notificationRepository.countByCategory.mockResolvedValue(breakdown);

    await expect(getUnreadCount('u1', { byCategory: true })).resolves.toBe(breakdown);
    expect(notificationServiceClient.getUnreadCount).not.toHaveBeenCalled();
  });
});

describe('notification/application/getNotifications', () => {
  it('delegates to the notification service client', async () => {
    const options = { page: 1 };
    notificationServiceClient.getNotifications.mockResolvedValue({ items: [] });

    await expect(getNotifications('u1', options)).resolves.toEqual({ items: [] });
    expect(notificationServiceClient.getNotifications).toHaveBeenCalledWith('u1', options);
  });
});
