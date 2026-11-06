jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByPaymentMethodId: jest.fn(),
}));

const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const {
  getSavedPaymentMethodForCheckout,
} = require('@modules/payment/application/guest/getSavedPaymentMethodForCheckout');

describe('payment/application/guest/getSavedPaymentMethodForCheckout', () => {
  it('returns null when no payment method id is given', async () => {
    await expect(getSavedPaymentMethodForCheckout('u1', null)).resolves.toBeNull();
    expect(savedPaymentMethodRepository.findByPaymentMethodId).not.toHaveBeenCalled();
  });

  it('returns null for a card owned by another user', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      user_id: 'someone-else',
      stripe_customer_id: 'cus_x',
    });

    await expect(getSavedPaymentMethodForCheckout('u1', 'pm_1')).resolves.toBeNull();
  });

  it('returns the owning customer for a saved card', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      user_id: 'u1',
      stripe_customer_id: 'cus_1',
    });

    await expect(getSavedPaymentMethodForCheckout('u1', 'pm_1')).resolves.toEqual({
      customerId: 'cus_1',
    });
  });
});
