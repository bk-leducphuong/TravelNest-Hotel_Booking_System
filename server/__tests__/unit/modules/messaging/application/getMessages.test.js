jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findAccessContext: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/message.repository', () => ({
  listPage: jest.fn(),
}));

const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const messageRepository = require('@modules/messaging/infrastructure/message.repository');
const {
  getGuestMessages,
  getHotelMessages,
} = require('@modules/messaging/application/getMessages');

const GUEST_ID = '11111111-1111-7111-8111-111111111111';
const HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-7333-8333-333333333333';

function conversation() {
  return {
    id: CONVERSATION_ID,
    hotel_id: HOTEL_ID,
    guest_user_id: GUEST_ID,
    last_message_seq: 12,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getGuestMessages', () => {
  it('returns a mapped page for the owning guest', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());
    messageRepository.listPage.mockResolvedValue({
      messages: [
        {
          id: 'm1',
          conversation_id: CONVERSATION_ID,
          seq: 11,
          sender_side: 'hotel',
          type: 'text',
          body: 'Welcome',
          sender: { id: 'u1', first_name: 'Mai', last_name: 'Nguyen' },
        },
      ],
      hasMore: true,
    });

    const result = await getGuestMessages({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      limit: 30,
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      seq: 11,
      senderSide: 'hotel',
      sender: { firstName: 'Mai', lastName: 'Nguyen' },
    });
    expect(result.hasMore).toBe(true);
    expect(result.latestSeq).toBe(12);
    expect(messageRepository.listPage).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      beforeSeq: null,
      limit: 30,
    });
  });

  it('returns null for a thread the guest does not own', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expect(
      getGuestMessages({
        userId: '99999999-9999-7999-8999-999999999999',
        conversationId: CONVERSATION_ID,
      })
    ).resolves.toBeNull();
    expect(messageRepository.listPage).not.toHaveBeenCalled();
  });

  it('returns null when the thread does not exist', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(null);

    await expect(
      getGuestMessages({ userId: GUEST_ID, conversationId: CONVERSATION_ID })
    ).resolves.toBeNull();
  });
});

describe('getHotelMessages', () => {
  it('returns the page for the hotel that owns the thread', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());
    messageRepository.listPage.mockResolvedValue({ messages: [], hasMore: false });

    const result = await getHotelMessages({
      hotelId: HOTEL_ID,
      conversationId: CONVERSATION_ID,
      beforeSeq: 5,
    });

    expect(result).toEqual({
      conversationId: CONVERSATION_ID,
      messages: [],
      hasMore: false,
      latestSeq: 12,
    });
    expect(messageRepository.listPage).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      beforeSeq: 5,
      limit: 30,
    });
  });

  it('returns null for another hotel', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expect(
      getHotelMessages({
        hotelId: 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
        conversationId: CONVERSATION_ID,
      })
    ).resolves.toBeNull();
  });
});
