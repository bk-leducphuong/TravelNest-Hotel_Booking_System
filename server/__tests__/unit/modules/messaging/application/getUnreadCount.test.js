jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  countUnreadByScope: jest.fn(),
}));

const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const {
  getGuestUnreadCount,
  getHotelUnreadCount,
} = require('@modules/messaging/application/getUnreadCount');

const GUEST_ID = '11111111-1111-7111-8111-111111111111';
const HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const READER_ID = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('unread badge scopes', () => {
  it('counts only hotel messages for a guest', async () => {
    conversationRepository.countUnreadByScope.mockResolvedValue(2);

    const result = await getGuestUnreadCount(GUEST_ID);

    expect(result).toEqual({ unread: 2 });
    expect(conversationRepository.countUnreadByScope).toHaveBeenCalledWith({
      scope: 'guest',
      scopeValue: GUEST_ID,
      readerUserId: GUEST_ID,
      otherSide: 'hotel',
    });
  });

  it('counts only guest messages for hotel staff', async () => {
    conversationRepository.countUnreadByScope.mockResolvedValue(5);

    const result = await getHotelUnreadCount({ hotelId: HOTEL_ID, readerUserId: READER_ID });

    expect(result).toEqual({ unread: 5 });
    expect(conversationRepository.countUnreadByScope).toHaveBeenCalledWith({
      scope: 'hotel',
      scopeValue: HOTEL_ID,
      readerUserId: READER_ID,
      otherSide: 'guest',
    });
  });
});
