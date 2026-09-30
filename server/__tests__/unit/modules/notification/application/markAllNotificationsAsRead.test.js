jest.mock('@modules/notification/infrastructure/notification-service.client', () => ({
  notificationServiceClient: { markAllNotificationsAsRead: jest.fn() },
}));

const {
  notificationServiceClient,
} = require('@modules/notification/infrastructure/notification-service.client');
const {
  markAllNotificationsAsRead,
} = require('@modules/notification/application/markAllNotificationsAsRead');

describe('notification/application/markAllNotificationsAsRead', () => {
  it('returns the updated count from the notification service', async () => {
    notificationServiceClient.markAllNotificationsAsRead.mockResolvedValue({ updatedCount: 4 });

    await expect(markAllNotificationsAsRead('u1')).resolves.toBe(4);
    expect(notificationServiceClient.markAllNotificationsAsRead).toHaveBeenCalledWith('u1');
  });
});
