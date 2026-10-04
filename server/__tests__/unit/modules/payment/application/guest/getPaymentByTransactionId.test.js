jest.mock('@modules/payment/infrastructure/transaction.repository', () => ({
  findById: jest.fn(),
}));

const transactionRepository = require('@modules/payment/infrastructure/transaction.repository');
const {
  getPaymentByTransactionId,
} = require('@modules/payment/application/guest/getPaymentByTransactionId');

describe('payment/application/guest/getPaymentByTransactionId', () => {
  it('throws 404 when the transaction does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(getPaymentByTransactionId(7, 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('throws 403 when the transaction belongs to another buyer', async () => {
    transactionRepository.findById.mockResolvedValue({ id: 7, buyer_id: 99 });

    await expect(getPaymentByTransactionId(7, 1)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns the transaction for its buyer', async () => {
    const transaction = { id: 7, buyer_id: 1 };
    transactionRepository.findById.mockResolvedValue(transaction);

    await expect(getPaymentByTransactionId(7, 1)).resolves.toBe(transaction);
  });
});
