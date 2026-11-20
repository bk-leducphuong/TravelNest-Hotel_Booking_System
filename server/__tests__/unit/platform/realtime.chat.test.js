jest.mock('@config/logger.config', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@modules/messaging', () => ({
  resolveConversationAccess: jest.fn(),
}));

const { resolveConversationAccess } = require('@modules/messaging');
const { registerChatHandlers } = require('@platform/realtime/namespaces/chat');

function buildSocket() {
  const handlers = {};
  const emitted = { '/user': [], '/property': [] };

  const socket = {
    id: 'guest-socket',
    on: (event, handler) => {
      handlers[event] = handler;
    },
    join: jest.fn(),
    leave: jest.fn(),
    server: {
      of: jest.fn((namespaceName) => ({
        except: jest.fn((socketId) => ({
          to: jest.fn((room) => ({
            emit: jest.fn((event, payload) => {
              emitted[namespaceName].push({ event, payload, room, socketId });
            }),
          })),
        })),
      })),
    },
  };

  return { socket, handlers, emitted };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat socket handlers', () => {
  it('broadcasts typing to both participant namespaces and excludes the sender', async () => {
    resolveConversationAccess.mockResolvedValue({
      side: 'guest',
      conversation: { last_message_seq: 4 },
    });
    const { socket, handlers, emitted } = buildSocket();
    registerChatHandlers({ namespace: {}, socket, userId: 'guest-1', hotelIds: [] });

    await handlers['chat:typing']({ conversationId: 'conversation-1' });

    expect(socket.server.of).toHaveBeenCalledWith('/user');
    expect(socket.server.of).toHaveBeenCalledWith('/property');
    expect(emitted['/user']).toHaveLength(1);
    expect(emitted['/property']).toHaveLength(1);
    expect(emitted['/property'][0]).toMatchObject({
      event: 'chat:typing',
      room: 'conversation_conversation-1',
      socketId: 'guest-socket',
      payload: { conversationId: 'conversation-1', side: 'guest' },
    });
  });

  it('does not broadcast typing for a thread the sender cannot access', async () => {
    resolveConversationAccess.mockResolvedValue(null);
    const { socket, handlers, emitted } = buildSocket();
    registerChatHandlers({ namespace: {}, socket, userId: 'guest-1', hotelIds: [] });

    await handlers['chat:typing']({ conversationId: 'conversation-1' });

    expect(socket.server.of).not.toHaveBeenCalled();
    expect(emitted['/user']).toHaveLength(0);
    expect(emitted['/property']).toHaveLength(0);
  });

  it('refuses to join a foreign thread without confirming it exists', async () => {
    resolveConversationAccess.mockResolvedValue(null);
    const { socket, handlers } = buildSocket();
    registerChatHandlers({ namespace: {}, socket, userId: 'guest-2', hotelIds: [] });
    const ack = jest.fn();

    await handlers['chat:join']({ conversationId: 'conversation-1' }, ack);

    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      success: false,
      message: 'Conversation not found',
    });
  });

  it('joins an accessible thread and returns the latest sequence', async () => {
    resolveConversationAccess.mockResolvedValue({
      side: 'hotel',
      conversation: { last_message_seq: 9 },
    });
    const { socket, handlers } = buildSocket();
    registerChatHandlers({ namespace: {}, socket, userId: 'owner-1', hotelIds: ['hotel-1'] });
    const ack = jest.fn();

    await handlers['chat:join']({ conversationId: 'conversation-1' }, ack);

    expect(socket.join).toHaveBeenCalledWith('conversation_conversation-1');
    expect(ack).toHaveBeenCalledWith({
      success: true,
      conversationId: 'conversation-1',
      side: 'hotel',
      latestSeq: 9,
    });
  });
});
