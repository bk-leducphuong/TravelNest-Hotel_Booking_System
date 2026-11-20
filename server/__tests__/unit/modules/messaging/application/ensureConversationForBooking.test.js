jest.mock('@modules/booking', () => ({
  getBookingForPayment: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findByBookingId: jest.fn(),
  create: jest.fn(),
  findDetailById: jest.fn(),
}));

const bookingModule = require('@modules/booking');
const conversationRepository = require('@modules/messaging/infrastructure/conversation.repository');
const {
  ensureConversationForBooking,
  openConversationForGuest,
} = require('@modules/messaging/application/ensureConversationForBooking');

const BOOKING_ID = '11111111-1111-7111-8111-111111111111';
const HOTEL_ID = '22222222-2222-7222-8222-222222222222';
const GUEST_ID = '33333333-3333-7333-8333-333333333333';

beforeEach(() => {
  jest.clearAllMocks();
  conversationRepository.findDetailById.mockResolvedValue(null);
});

describe('ensureConversationForBooking', () => {
  it('returns the existing thread without reloading the booking', async () => {
    const existing = { id: 'c1', booking_id: BOOKING_ID };
    conversationRepository.findByBookingId.mockResolvedValue(existing);

    await expect(ensureConversationForBooking(BOOKING_ID)).resolves.toBe(existing);
    expect(bookingModule.getBookingForPayment).not.toHaveBeenCalled();
    expect(conversationRepository.create).not.toHaveBeenCalled();
  });

  it('creates a thread for a real booking', async () => {
    conversationRepository.findByBookingId.mockResolvedValue(null);
    bookingModule.getBookingForPayment.mockResolvedValue({
      id: BOOKING_ID,
      hotel_id: HOTEL_ID,
      buyer_id: GUEST_ID,
      status: 'confirmed',
    });
    conversationRepository.create.mockResolvedValue({ id: 'new-conversation' });

    const result = await ensureConversationForBooking(BOOKING_ID);

    expect(result).toEqual({ id: 'new-conversation' });
    expect(conversationRepository.create).toHaveBeenCalledWith({
      hotel_id: HOTEL_ID,
      booking_id: BOOKING_ID,
      guest_user_id: GUEST_ID,
    });
  });

  it('rejects an unknown booking', async () => {
    conversationRepository.findByBookingId.mockResolvedValue(null);
    bookingModule.getBookingForPayment.mockResolvedValue(null);

    await expect(ensureConversationForBooking(BOOKING_ID)).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('refuses bookings that expired before payment', async () => {
    conversationRepository.findByBookingId.mockResolvedValue(null);
    bookingModule.getBookingForPayment.mockResolvedValue({
      id: BOOKING_ID,
      hotel_id: HOTEL_ID,
      buyer_id: GUEST_ID,
      status: 'expired',
    });

    await expect(ensureConversationForBooking(BOOKING_ID)).rejects.toMatchObject({
      code: 'CONVERSATION_NOT_ALLOWED',
    });
    expect(conversationRepository.create).not.toHaveBeenCalled();
  });

  it('resolves the race when two callers create the same thread', async () => {
    conversationRepository.findByBookingId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'winner' });
    bookingModule.getBookingForPayment.mockResolvedValue({
      id: BOOKING_ID,
      hotel_id: HOTEL_ID,
      buyer_id: GUEST_ID,
      status: 'confirmed',
    });

    const uniqueError = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    conversationRepository.create.mockRejectedValue(uniqueError);

    await expect(ensureConversationForBooking(BOOKING_ID)).resolves.toEqual({ id: 'winner' });
  });
});

describe('openConversationForGuest', () => {
  it('rejects a booking that belongs to another guest', async () => {
    conversationRepository.findByBookingId.mockResolvedValue({
      id: 'c1',
      guest_user_id: '99999999-9999-7999-8999-999999999999',
    });

    await expect(
      openConversationForGuest({ userId: GUEST_ID, bookingId: BOOKING_ID })
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });

  it('does not create a thread for a booking the caller does not own', async () => {
    conversationRepository.findByBookingId.mockResolvedValue(null);
    bookingModule.getBookingForPayment.mockResolvedValue({
      id: BOOKING_ID,
      hotel_id: HOTEL_ID,
      buyer_id: '99999999-9999-7999-8999-999999999999',
      status: 'confirmed',
    });

    await expect(
      openConversationForGuest({ userId: GUEST_ID, bookingId: BOOKING_ID })
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    expect(conversationRepository.create).not.toHaveBeenCalled();
  });

  it('opens the existing thread for its guest', async () => {
    conversationRepository.findByBookingId.mockResolvedValue({
      id: 'c1',
      guest_user_id: GUEST_ID,
    });

    await expect(
      openConversationForGuest({ userId: GUEST_ID, bookingId: BOOKING_ID })
    ).resolves.toEqual({ id: 'c1', guest_user_id: GUEST_ID });
  });
});
