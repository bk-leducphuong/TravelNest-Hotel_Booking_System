jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findForGuest: jest.fn(),
  findForHotel: jest.fn(),
  countUnreadForConversations: jest.fn(),
}));

const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const {
  listGuestConversations,
  listHotelConversations,
} = require('@modules/messaging/application/listConversations');

const GUEST_ID = '11111111-1111-7111-8111-111111111111';
const HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-7333-8333-333333333333';
const READER_ID = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';

function row(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    status: 'open',
    last_message_seq: 4,
    last_message_at: new Date('2026-11-11T10:00:00Z'),
    last_message_preview: 'Hello',
    hotel: { id: HOTEL_ID, name: 'Beach House' },
    booking: {
      id: 'b1',
      booking_code: 'TN-1',
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-05',
      status: 'confirmed',
    },
    guest: { id: GUEST_ID, first_name: 'Mai', last_name: 'Nguyen', profile_picture_url: null },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listGuestConversations', () => {
  it('maps the inbox row and attaches unread counts', async () => {
    conversationRepository.findForGuest.mockResolvedValue({ rows: [row()], count: 1 });
    conversationRepository.countUnreadForConversations.mockResolvedValue(
      new Map([[CONVERSATION_ID, 3]])
    );

    const result = await listGuestConversations({ userId: GUEST_ID, page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.conversations[0]).toEqual({
      id: CONVERSATION_ID,
      status: 'open',
      lastMessageSeq: 4,
      lastMessageAt: new Date('2026-11-11T10:00:00Z'),
      lastMessagePreview: 'Hello',
      unreadCount: 3,
      hotel: { id: HOTEL_ID, name: 'Beach House' },
      booking: {
        id: 'b1',
        bookingCode: 'TN-1',
        checkInDate: '2026-12-01',
        checkOutDate: '2026-12-05',
        status: 'confirmed',
      },
    });
    // Guests never receive their own profile echoed back.
    expect(result.conversations[0].guest).toBeUndefined();
    expect(conversationRepository.countUnreadForConversations).toHaveBeenCalledWith(
      [CONVERSATION_ID],
      GUEST_ID,
      'hotel'
    );
  });
});

describe('listHotelConversations', () => {
  it('includes guest identity for the hotel side', async () => {
    conversationRepository.findForHotel.mockResolvedValue({ rows: [row()], count: 1 });
    conversationRepository.countUnreadForConversations.mockResolvedValue(new Map());

    const result = await listHotelConversations({
      hotelId: HOTEL_ID,
      readerUserId: READER_ID,
      page: 1,
      limit: 20,
    });

    expect(result.conversations[0].guest).toEqual({
      id: GUEST_ID,
      firstName: 'Mai',
      lastName: 'Nguyen',
      avatarUrl: null,
    });
    expect(result.conversations[0].unreadCount).toBe(0);
    expect(conversationRepository.countUnreadForConversations).toHaveBeenCalledWith(
      [CONVERSATION_ID],
      READER_ID,
      'guest'
    );
  });
});
