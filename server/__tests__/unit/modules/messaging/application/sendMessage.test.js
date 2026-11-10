jest.mock('@config/database.config', () => ({
  transaction: jest.fn(async (callback) => callback('tx')),
}));

jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findAccessContext: jest.fn(),
  findByIdForUpdate: jest.fn(),
  updateLastMessage: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/message.repository', () => ({
  findByIdempotencyKey: jest.fn(),
  create: jest.fn(),
  loadWithSender: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/socket-emitter', () => ({
  emitNewMessage: jest.fn(),
  emitReadReceipt: jest.fn(),
}));

const sequelize = require('@config/database.config');
const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const messageRepository = require('@modules/messaging/infrastructure/message.repository');
const socketEmitter = require('@modules/messaging/infrastructure/socket-emitter');
const {
  sendGuestMessage,
  sendHotelMessage,
} = require('@modules/messaging/application/sendMessage');

const GUEST_ID = '11111111-1111-7111-8111-111111111111';
const HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-7333-8333-333333333333';

function conversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    hotel_id: HOTEL_ID,
    guest_user_id: GUEST_ID,
    status: 'open',
    last_message_seq: 7,
    booking: { check_out_date: futureDate() },
    ...overrides,
  };
}

function futureDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 10);
  return date.toISOString().slice(0, 10);
}

function pastDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 60);
  return date.toISOString().slice(0, 10);
}

function expectApiError(promise, code) {
  return expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  jest.clearAllMocks();
  // `resetMocks` clears factory implementations between tests.
  sequelize.transaction.mockImplementation(async (callback) => callback('tx'));
  messageRepository.findByIdempotencyKey.mockResolvedValue(null);
  conversationRepository.findByIdForUpdate.mockResolvedValue({
    id: CONVERSATION_ID,
    status: 'open',
    last_message_seq: 7,
  });
  messageRepository.create.mockImplementation(async (payload) => ({
    id: '44444444-4444-7444-8444-444444444444',
    ...payload,
  }));
  messageRepository.loadWithSender.mockImplementation(async (id) => ({
    id,
    conversation_id: CONVERSATION_ID,
    seq: 8,
    sender_side: 'guest',
    type: 'text',
    body: 'Hello',
    created_at: new Date('2026-11-11T10:00:00Z'),
  }));
});

describe('sendGuestMessage', () => {
  it('allocates the next sequence and emits the committed message', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    const result = await sendGuestMessage({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      body: '  Hello  ',
      clientMessageId: '55555555-5555-7555-8555-555555555555',
    });

    expect(result.seq).toBe(8);
    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: CONVERSATION_ID,
        seq: 8,
        sender_side: 'guest',
        sender_user_id: GUEST_ID,
        body: 'Hello',
        flagged: false,
      }),
      { transaction: 'tx' }
    );
    expect(conversationRepository.updateLastMessage).toHaveBeenCalledWith(
      CONVERSATION_ID,
      expect.objectContaining({ seq: 8, preview: 'Hello' }),
      { transaction: 'tx' }
    );
    expect(socketEmitter.emitNewMessage).toHaveBeenCalledTimes(1);
  });

  it('hides threads that belong to another guest', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expectApiError(
      sendGuestMessage({
        userId: '99999999-9999-7999-8999-999999999999',
        conversationId: CONVERSATION_ID,
        body: 'Hi',
      }),
      'CONVERSATION_NOT_FOUND'
    );

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rejects empty and over-long bodies before writing', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expectApiError(
      sendGuestMessage({ userId: GUEST_ID, conversationId: CONVERSATION_ID, body: '   ' }),
      'MESSAGE_EMPTY'
    );
    await expectApiError(
      sendGuestMessage({
        userId: GUEST_ID,
        conversationId: CONVERSATION_ID,
        body: 'x'.repeat(4001),
      }),
      'MESSAGE_TOO_LONG'
    );
  });

  it('rejects sends after the post-check-out window', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(
      conversation({ booking: { check_out_date: pastDate() } })
    );

    await expectApiError(
      sendGuestMessage({ userId: GUEST_ID, conversationId: CONVERSATION_ID, body: 'Late hello' }),
      'CONVERSATION_SEND_WINDOW_CLOSED'
    );
  });

  it('returns the existing message for a retried clientMessageId without re-emitting', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());
    messageRepository.findByIdempotencyKey.mockResolvedValue({
      id: '66666666-6666-7666-8666-666666666666',
      conversation_id: CONVERSATION_ID,
      seq: 3,
      sender_side: 'guest',
      type: 'text',
      body: 'Hello',
    });

    const result = await sendGuestMessage({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      body: 'Hello',
      clientMessageId: '77777777-7777-7777-8777-777777777777',
    });

    expect(result.seq).toBe(3);
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(socketEmitter.emitNewMessage).not.toHaveBeenCalled();
  });

  it('flags contact sharing but still stores the message', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await sendGuestMessage({
      userId: GUEST_ID,
      conversationId: CONVERSATION_ID,
      body: 'WhatsApp me on +84 912 345 678',
    });

    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ flagged: true, flag_reason: 'phone' }),
      expect.anything()
    );
  });
});

describe('sendHotelMessage', () => {
  it('lets hotel staff reply even after the guest send window closed', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(
      conversation({ booking: { check_out_date: pastDate() } })
    );

    const result = await sendHotelMessage({
      hotelId: HOTEL_ID,
      senderUserId: '88888888-8888-7888-8888-888888888888',
      conversationId: CONVERSATION_ID,
      body: 'Thanks for staying with us',
    });

    expect(result).toBeTruthy();
    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ sender_side: 'hotel' }),
      expect.anything()
    );
  });

  it('rejects a hotel that does not own the thread', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(conversation());

    await expectApiError(
      sendHotelMessage({
        hotelId: 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
        senderUserId: 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
        conversationId: CONVERSATION_ID,
        body: 'Hi',
      }),
      'CONVERSATION_NOT_FOUND'
    );
  });

  it('rejects a closed thread', async () => {
    conversationRepository.findAccessContext.mockResolvedValue(
      conversation({ status: 'archived' })
    );

    await expectApiError(
      sendHotelMessage({
        hotelId: HOTEL_ID,
        senderUserId: '88888888-8888-7888-8888-888888888888',
        conversationId: CONVERSATION_ID,
        body: 'Hi',
      }),
      'CONVERSATION_CLOSED'
    );
  });
});
