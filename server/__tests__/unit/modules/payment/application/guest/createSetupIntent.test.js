const mockAdapterInstance = {
  createCustomer: jest.fn(),
  createSetupIntent: jest.fn(),
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

const identity = require('@modules/identity');
const { createSetupIntent } = require('@modules/payment/application/guest/createSetupIntent');

describe('payment/application/guest/createSetupIntent', () => {
  it('reuses the existing Stripe customer', async () => {
    identity.users.getStripeCustomerId.mockResolvedValue('cus_existing');
    mockAdapterInstance.createSetupIntent.mockResolvedValue({
      id: 'seti_1',
      clientSecret: 'cs_1',
      customerId: 'cus_existing',
    });

    const result = await createSetupIntent('u1');

    expect(identity.users.createCustomer).toBeUndefined();
    expect(mockAdapterInstance.createSetupIntent).toHaveBeenCalledWith({
      customerId: 'cus_existing',
      metadata: { user_id: 'u1' },
    });
    expect(result).toEqual({
      clientSecret: 'cs_1',
      setupIntentId: 'seti_1',
      customerId: 'cus_existing',
    });
  });

  it('creates and persists a customer when none exists', async () => {
    identity.users.getStripeCustomerId.mockResolvedValue(null);
    identity.users.getPaymentCustomerContact.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      name: 'Ada Lovelace',
    });
    mockAdapterInstance.createCustomer.mockResolvedValue({ id: 'cus_new' });
    mockAdapterInstance.createSetupIntent.mockResolvedValue({
      id: 'seti_2',
      clientSecret: 'cs_2',
      customerId: 'cus_new',
    });

    const result = await createSetupIntent('u1');

    expect(mockAdapterInstance.createCustomer).toHaveBeenCalledWith({
      email: 'a@example.com',
      name: 'Ada Lovelace',
      metadata: { user_id: 'u1' },
    });
    expect(identity.users.setStripeCustomerId).toHaveBeenCalledWith('u1', 'cus_new');
    expect(result.customerId).toBe('cus_new');
  });

  it('throws 404 when the user cannot be found', async () => {
    identity.users.getStripeCustomerId.mockResolvedValue(null);
    identity.users.getPaymentCustomerContact.mockResolvedValue(null);

    await expect(createSetupIntent('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
