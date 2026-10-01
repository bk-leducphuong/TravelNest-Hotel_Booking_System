jest.mock('@socket/index', () => ({ getNamespace: jest.fn() }));
jest.mock('@socket/controllers/user.controller', () => ({ sendHoldExpired: jest.fn() }));

const { getNamespace } = require('@socket/index');
const userController = require('@socket/controllers/user.controller');
const { handleHoldExpired } = require('@platform/events/consumers/holdExpiry');

describe('platform/events/consumers/holdExpiry', () => {
  it('forwards the hold to the user socket room', () => {
    const namespace = {};
    getNamespace.mockReturnValue(namespace);

    handleHoldExpired({
      payload: {
        userId: 'u1',
        holdId: 'h1',
        hotelId: 'ho1',
        expiredAt: '2030-01-01T00:00:00.000Z',
      },
    });

    expect(getNamespace).toHaveBeenCalledWith('/user');
    expect(userController.sendHoldExpired).toHaveBeenCalledWith(
      namespace,
      'u1',
      expect.objectContaining({ type: 'hold:expired', userId: 'u1', holdId: 'h1' })
    );
  });

  it('ignores payloads without a user or hold', () => {
    handleHoldExpired({ payload: { userId: 'u1' } });

    expect(getNamespace).not.toHaveBeenCalled();
    expect(userController.sendHoldExpired).not.toHaveBeenCalled();
  });
});
