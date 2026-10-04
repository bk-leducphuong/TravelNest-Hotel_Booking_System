jest.mock('@platform/realtime', () => ({ sendHoldExpired: jest.fn() }));

const { sendHoldExpired } = require('@platform/realtime');
const { handleHoldExpired } = require('@platform/events/consumers/holdExpiry');

describe('platform/events/consumers/holdExpiry', () => {
  it('forwards the hold to the user socket room', () => {
    handleHoldExpired({
      payload: {
        userId: 'u1',
        holdId: 'h1',
        hotelId: 'ho1',
        expiredAt: '2030-01-01T00:00:00.000Z',
      },
    });

    expect(sendHoldExpired).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ type: 'hold:expired', userId: 'u1', holdId: 'h1' })
    );
  });

  it('ignores payloads without a user or hold', () => {
    handleHoldExpired({ payload: { userId: 'u1' } });

    expect(sendHoldExpired).not.toHaveBeenCalled();
  });
});
