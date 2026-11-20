jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findAccessContext: jest.fn(),
  hideForGuest: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/socket-emitter', () => ({
  emitConversationDeleted: jest.fn(),
}));

const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const socketEmitter = require('@modules/messaging/infrastructure/socket-emitter');
const {
  deleteConversationForGuest,
} = require('@modules/messaging/application/deleteConversationForGuest');

const GUEST_ID = '11111111-1111-7111-8111-111111111111';
const OTHER_GUEST_ID = '22222222-2222-7222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-7333-8333-333333333333';

function conversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    guest_user_id: GUEST_ID,
    hotel_id: '44444444-4444-7444-8444-444444444444',
    last_message_seq: 7,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('deleteConversationForGuest', () => {
  it('soft-deletes the thread and notifies the guest room', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());
    conversationRepository.hideForGuest.mockResolvedValue(1);

    const result = await deleteConversationForGuest({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
    });

    expect(result).toEqual({ conversationId: CONVERSATION_ID, deleted: true });
    expect(conversationRepository.hideForGuest).toHaveBeenCalledWith(CONVERSATION_ID, GUEST_ID);
    expect(socketEmitter.emitConversationDeleted).toHaveBeenCalledWith({
      conversation: conversation(),
      guestUserId: GUEST_ID,
    });
  });

  it('rejects a conversation owned by another guest', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(
      conversation({ guest_user_id: OTHER_GUEST_ID })
    );

    await expect(
      deleteConversationForGuest({ userId: GUEST_ID, conversationId: CONVERSATION_ID })
    ).rejects.toMatchObject({ statusCode: 404, code: 'CONVERSATION_NOT_FOUND' });

    expect(conversationRepository.hideForGuest).not.toHaveBeenCalled();
    expect(socketEmitter.emitConversationDeleted).not.toHaveBeenCalled();
  });

  it('returns 404 when the conversation does not exist', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(null);

    await expect(
      deleteConversationForGuest({ userId: GUEST_ID, conversationId: CONVERSATION_ID })
    ).rejects.toMatchObject({ statusCode: 404, code: 'CONVERSATION_NOT_FOUND' });
  });
});
