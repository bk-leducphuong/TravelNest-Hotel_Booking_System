jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findAccessContext: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/read-state.repository', () => ({
  upsertRead: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/socket-emitter', () => ({
  emitReadReceipt: jest.fn(),
  emitNewMessage: jest.fn(),
}));

const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const readStateRepository = require('@modules/messaging/infrastructure/read-state.repository');
const socketEmitter = require('@modules/messaging/infrastructure/socket-emitter');
const {
  markGuestConversationRead,
  markHotelConversationRead,
} = require('@modules/messaging/application/markConversationRead');

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
  readStateRepository.upsertRead.mockImplementation(async ({ lastSeq }) => ({
    last_read_seq: lastSeq,
  }));
});

describe('markGuestConversationRead', () => {
  it('clamps an out-of-range sequence to the latest message', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    const result = await markGuestConversationRead({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      lastSeq: 9999,
    });

    expect(readStateRepository.upsertRead).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      userId: GUEST_ID,
      lastSeq: 12,
    });
    expect(result).toEqual({ lastReadSeq: 12 });
    expect(socketEmitter.emitReadReceipt).toHaveBeenCalledWith({
      conversation: expect.objectContaining({ id: CONVERSATION_ID }),
      readerUserId: GUEST_ID,
      lastReadSeq: 12,
    });
  });

  it('never moves a cursor backwards', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());
    // The repository only advances cursors; the stored value wins here.
    readStateRepository.upsertRead.mockResolvedValue({ last_read_seq: 12 });

    const result = await markGuestConversationRead({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      lastSeq: 3,
    });

    expect(result).toEqual({ lastReadSeq: 12 });
  });

  it('rejects a thread the guest does not own', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expect(
      markGuestConversationRead({
        userId: '99999999-9999-7999-8999-999999999999',
        conversationId: CONVERSATION_ID,
        lastSeq: 5,
      })
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });

    expect(readStateRepository.upsertRead).not.toHaveBeenCalled();
  });
});

describe('markHotelConversationRead', () => {
  it('rejects a hotel that does not own the thread', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expect(
      markHotelConversationRead({
        hotelId: 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
        userId: 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
        conversationId: CONVERSATION_ID,
        lastSeq: 5,
      })
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });
});
