const mockAdapterInstance = {
  updateCustomerDefaultPaymentMethod: jest.fn(),
};

jest.mock('@modules/payment/infrastructure/adapters/stripe-payment.adapter', () =>
  jest.fn(() => mockAdapterInstance)
);

jest.mock('@config/database.config', () => ({
  transaction: (callback) => callback('tx'),
}));

jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByPaymentMethodId: jest.fn(),
  clearDefaultForUser: jest.fn(),
  setDefaultById: jest.fn(),
}));

const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const {
  setDefaultPaymentMethod,
} = require('@modules/payment/application/guest/setDefaultPaymentMethod');

describe('payment/application/guest/setDefaultPaymentMethod', () => {
  it('throws 404 for a card owned by another user', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      id: 'row_1',
      user_id: 'someone-else',
    });

    await expect(setDefaultPaymentMethod('u1', 'pm_1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PAYMENT_METHOD_NOT_FOUND',
    });
  });

  it('updates Stripe and flips the local default flag', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId
      .mockResolvedValueOnce({ id: 'row_1', user_id: 'u1', stripe_customer_id: 'cus_1' })
      .mockResolvedValueOnce({
        stripe_payment_method_id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        is_default: true,
      });

    const result = await setDefaultPaymentMethod('u1', 'pm_1');

    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).toHaveBeenCalledWith(
      'cus_1',
      'pm_1'
    );
    expect(savedPaymentMethodRepository.clearDefaultForUser).toHaveBeenCalledWith('u1', {
      transaction: 'tx',
    });
    expect(savedPaymentMethodRepository.setDefaultById).toHaveBeenCalledWith('row_1', {
      transaction: 'tx',
    });
    expect(result).toMatchObject({ id: 'pm_1', isDefault: true });
  });
});
