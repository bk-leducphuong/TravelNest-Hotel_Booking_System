const mockAdapterInstance = {
  getSetupIntent: jest.fn(),
  getPaymentMethod: jest.fn(),
  updateCustomerDefaultPaymentMethod: jest.fn(),
};

jest.mock('@modules/payment/infrastructure/adapters/stripe-payment.adapter', () =>
  jest.fn(() => mockAdapterInstance)
);

jest.mock('@modules/identity', () => ({
  users: {
    getStripeCustomerId: jest.fn(),
    getPaymentCustomerContact: jest.fn(),
    setStripeCustomerId: jest.fn(),
  },
}));

jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByPaymentMethodId: jest.fn(),
  countByUserId: jest.fn(),
  create: jest.fn(),
  updateByPaymentMethodId: jest.fn(),
}));

const identity = require('@modules/identity');
const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const { savePaymentMethod } = require('@modules/payment/application/guest/savePaymentMethod');

const card = {
  id: 'pm_1',
  customerId: 'cus_1',
  card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
  billingDetails: { name: 'Ada Lovelace' },
};

describe('payment/application/guest/savePaymentMethod', () => {
  beforeEach(() => {
    identity.users.getStripeCustomerId.mockResolvedValue('cus_1');
  });
  it('requires a setupIntentId', async () => {
    await expect(savePaymentMethod('u1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'MISSING_REQUIRED_FIELDS',
    });
  });

  it('rejects a setup intent that belongs to another customer', async () => {
    mockAdapterInstance.getSetupIntent.mockResolvedValue({
      customerId: 'cus_other',
      paymentMethodId: 'pm_1',
    });

    await expect(savePaymentMethod('u1', { setupIntentId: 'seti_1' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'PAYMENT_METHOD_FORBIDDEN',
    });
  });

  it('rejects when the card setup is not complete', async () => {
    mockAdapterInstance.getSetupIntent.mockResolvedValue({
      customerId: 'cus_1',
      paymentMethodId: null,
    });

    await expect(savePaymentMethod('u1', { setupIntentId: 'seti_1' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'PAYMENT_METHOD_NOT_READY',
    });
  });

  it('stores the first card as the default and syncs Stripe', async () => {
    mockAdapterInstance.getSetupIntent.mockResolvedValue({
      customerId: 'cus_1',
      paymentMethodId: 'pm_1',
    });
    mockAdapterInstance.getPaymentMethod.mockResolvedValue(card);
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValueOnce(null);
    savedPaymentMethodRepository.countByUserId.mockResolvedValue(0);
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValueOnce({
      stripe_payment_method_id: 'pm_1',
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2030,
      cardholder_name: 'Ada Lovelace',
      is_default: true,
    });

    const result = await savePaymentMethod('u1', { setupIntentId: 'seti_1' });

    expect(savedPaymentMethodRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', isDefault: true, paymentMethodId: 'pm_1' })
    );
    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).toHaveBeenCalledWith(
      'cus_1',
      'pm_1'
    );
    expect(result).toMatchObject({ id: 'pm_1', isDefault: true, brand: 'visa' });
  });

  it('updates an existing mirror row without forcing default', async () => {
    mockAdapterInstance.getSetupIntent.mockResolvedValue({
      customerId: 'cus_1',
      paymentMethodId: 'pm_1',
    });
    mockAdapterInstance.getPaymentMethod.mockResolvedValue(card);
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValueOnce({ id: 'row_1' });
    savedPaymentMethodRepository.countByUserId.mockResolvedValue(2);
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValueOnce({
      stripe_payment_method_id: 'pm_1',
      brand: 'visa',
      last4: '4242',
      is_default: false,
    });

    const result = await savePaymentMethod('u1', { setupIntentId: 'seti_1' });

    expect(savedPaymentMethodRepository.create).not.toHaveBeenCalled();
    expect(savedPaymentMethodRepository.updateByPaymentMethodId).toHaveBeenCalledWith(
      'pm_1',
      expect.objectContaining({ brand: 'visa', last4: '4242' })
    );
    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).not.toHaveBeenCalled();
    expect(result.isDefault).toBe(false);
  });
});
