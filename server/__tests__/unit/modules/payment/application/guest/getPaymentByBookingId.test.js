jest.mock('@modules/payment/infrastructure/payment.repository', () => ({
  findPaymentByBookingId: jest.fn(),
}));

const paymentRepository = require('@modules/payment/infrastructure/payment.repository');
const {
  getPaymentByBookingId,
} = require('@modules/payment/application/guest/getPaymentByBookingId');

describe('payment/application/guest/getPaymentByBookingId', () => {
  it('throws 404 when there is no payment', async () => {
    paymentRepository.findPaymentByBookingId.mockResolvedValue(null);

    await expect(getPaymentByBookingId('b1', 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('throws 403 for another buyer', async () => {
    paymentRepository.findPaymentByBookingId.mockResolvedValue({ buyer_id: 2 });

    await expect(getPaymentByBookingId('b1', 1)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns the payment for its buyer', async () => {
    const payment = { buyer_id: 1, payment_id: 9 };
    paymentRepository.findPaymentByBookingId.mockResolvedValue(payment);

    await expect(getPaymentByBookingId('b1', 1)).resolves.toBe(payment);
  });
});
