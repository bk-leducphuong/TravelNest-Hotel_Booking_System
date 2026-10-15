jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByUserId: jest.fn(),
}));

const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const { listPaymentMethods } = require('@modules/payment/application/guest/listPaymentMethods');

describe('payment/application/guest/listPaymentMethods', () => {
  it('maps stored rows to the guest view shape', async () => {
    savedPaymentMethodRepository.findByUserId.mockResolvedValue([
      {
        stripe_payment_method_id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2030,
        cardholder_name: 'Ada Lovelace',
        is_default: true,
        created_at: new Date('2026-01-01'),
      },
    ]);

    const result = await listPaymentMethods('u1');

    expect(savedPaymentMethodRepository.findByUserId).toHaveBeenCalledWith('u1');
    expect(result).toEqual([
      {
        id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        cardholderName: 'Ada Lovelace',
        isDefault: true,
        createdAt: new Date('2026-01-01'),
      },
    ]);
  });

  it('returns an empty list when there are no saved cards', async () => {
    savedPaymentMethodRepository.findByUserId.mockResolvedValue([]);

    await expect(listPaymentMethods('u1')).resolves.toEqual([]);
  });
});
