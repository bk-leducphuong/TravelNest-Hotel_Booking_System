jest.mock('@repositories/booking.repository', () => ({
  findPaymentContextByIdAndBuyerId: jest.fn(),
}));
jest.mock('@repositories/transaction.repository', () => ({ update: jest.fn() }));
jest.mock('@adapters/payment/stripePayment.adapter', () => {
  const instance = { getPayment: jest.fn(), createPayment: jest.fn() };
  const StripePaymentAdapter = jest.fn(() => instance);
  StripePaymentAdapter.instance = instance;
  return StripePaymentAdapter;
});

const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const {
  createPaymentIntentForBooking,
} = require('@modules/booking/application/guest/createPaymentIntentForBooking');

const provider = StripePaymentAdapter.instance;

const bookingData = {
  id: 5,
  booking_code: 'ABC123',
  status: 'pending_payment',
  total_price: '230.00',
  hotel_id: 10,
  payment_due_at: '2999-01-01T00:00:00Z',
  transaction: { id: 70, metadata: { foo: 'bar' }, stripe_payment_intent_id: null },
};

function mockBooking(overrides = {}) {
  const model = { ...bookingData, ...overrides, toJSON: () => model };
  // Ensure the toJSON snapshot matches the (possibly overridden) fields.
  Object.assign(model, overrides);
  return model;
}

describe('booking/application/guest/createPaymentIntentForBooking', () => {
  it("throws 404 when the booking is not the buyer's", async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(null);

    await expect(createPaymentIntentForBooking(5, 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('rejects bookings that are not pending payment', async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(
      mockBooking({ status: 'confirmed' })
    );

    await expect(createPaymentIntentForBooking(5, 1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BOOKING_NOT_PENDING_PAYMENT',
    });
  });

  it('rejects an expired payment window', async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(
      mockBooking({ payment_due_at: '2000-01-01T00:00:00Z' })
    );

    await expect(createPaymentIntentForBooking(5, 1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BOOKING_PAYMENT_EXPIRED',
    });
  });

  it('throws 500 when there is no pending transaction', async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(
      mockBooking({ transaction: null })
    );

    await expect(createPaymentIntentForBooking(5, 1)).rejects.toMatchObject({
      statusCode: 500,
      code: 'TRANSACTION_NOT_FOUND',
    });
  });

  it('returns the existing payment intent instead of creating a new one', async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(
      mockBooking({
        transaction: { id: 70, metadata: {}, stripe_payment_intent_id: 'pi_existing' },
      })
    );
    provider.getPayment.mockResolvedValue({
      id: 'pi_existing',
      status: 'pending',
      raw: { client_secret: 'cs_existing' },
    });

    const result = await createPaymentIntentForBooking(5, 1);

    expect(provider.getPayment).toHaveBeenCalledWith('pi_existing');
    expect(provider.createPayment).not.toHaveBeenCalled();
    expect(result).toEqual({
      clientSecret: 'cs_existing',
      paymentIntentId: 'pi_existing',
      status: 'pending',
      bookingId: 5,
      bookingCode: 'ABC123',
    });
  });

  it('creates a new intent and persists it on the transaction', async () => {
    bookingRepository.findPaymentContextByIdAndBuyerId.mockResolvedValue(mockBooking());
    provider.createPayment.mockResolvedValue({
      id: 'pi_new',
      clientSecret: 'cs_new',
      status: 'pending',
    });

    const result = await createPaymentIntentForBooking(5, 1, { paymentMethod: 'card' });

    expect(provider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 23000,
        currency: 'USD',
        metadata: expect.objectContaining({ booking_id: 5, transaction_id: 70, buyer_id: 1 }),
      })
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(70, {
      paymentIntentId: 'pi_new',
      paymentMethod: 'card',
      metadata: {
        foo: 'bar',
        booking_code: 'ABC123',
        stripe_payment_intent_status: 'pending',
      },
    });
    expect(result).toEqual({
      clientSecret: 'cs_new',
      paymentIntentId: 'pi_new',
      status: 'pending',
      bookingId: 5,
      bookingCode: 'ABC123',
    });
  });
});
