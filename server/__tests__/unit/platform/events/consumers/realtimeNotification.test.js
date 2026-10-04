jest.mock('@platform/realtime', () => ({ getNamespace: jest.fn() }));

const { getNamespace } = require('@platform/realtime');
const { handleRealtimeNotification } = require('@platform/events/consumers/realtimeNotification');

const namespace = { to: jest.fn() };
const room = { emit: jest.fn() };

describe('platform/events/consumers/realtimeNotification', () => {
  beforeEach(() => {
    getNamespace.mockReturnValue(namespace);
    namespace.to.mockReturnValue(room);
    room.emit.mockReturnValue(undefined);
  });

  it('forwards each target to its socket room', () => {
    handleRealtimeNotification({
      eventId: 'evt-1',
      payload: {
        notification: { id: 'n1', title: 'Hi' },
        unreadCount: 3,
        targets: [{ namespace: '/user', room: 'user_u1', event: 'notification:new' }],
      },
    });

    expect(getNamespace).toHaveBeenCalledWith('/user');
    expect(namespace.to).toHaveBeenCalledWith('user_u1');
    expect(room.emit).toHaveBeenCalledWith('notification:new', { id: 'n1', title: 'Hi' });
    expect(room.emit).toHaveBeenCalledWith('notifications:unreadCountUpdate', { count: 3 });
  });

  it('ignores invalid payloads', () => {
    handleRealtimeNotification({ payload: { notification: { id: 'n1' }, targets: [] } });

    expect(getNamespace).not.toHaveBeenCalled();
  });

  it('skips targets missing a room or event', () => {
    handleRealtimeNotification({
      payload: {
        notification: { id: 'n1' },
        targets: [{ namespace: '/user', room: 'user_u1' }],
      },
    });

    expect(namespace.to).not.toHaveBeenCalled();
  });
});
