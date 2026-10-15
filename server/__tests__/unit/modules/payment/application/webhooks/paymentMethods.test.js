jest.mock('@modules/identity', () => ({
  users: {
    findUserIdByStripeCustomerId: jest.fn(),
  },
}));

jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByPaymentMethodId: jest.fn(),
  countByUserId: jest.fn(),
  create: jest.fn(),
  updateByPaymentMethodId: jest.fn(),
  deleteByPaymentMethodId: jest.fn(),
  findByUserId: jest.fn(),
}));

const identity = require('@modules/identity');
const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const {
  handlePaymentMethodAttached,
} = require('@modules/payment/application/webhooks/handlePaymentMethodAttached');
const {
  handlePaymentMethodDetached,
} = require('@modules/payment/application/webhooks/handlePaymentMethodDetached');
const {
  handleCustomerUpdated,
} = require('@modules/payment/application/webhooks/handleCustomerUpdated');

const stripePaymentMethod = {
  id: 'pm_1',
  customer: 'cus_1',
  card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
  billing_details: { name: 'Ada Lovelace' },
};

describe('payment/application/webhooks payment methods', () => {
  describe('handlePaymentMethodAttached', () => {
    it('creates a mirror row for a known customer', async () => {
      identity.users.findUserIdByStripeCustomerId.mockResolvedValue('u1');
      savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue(null);
      savedPaymentMethodRepository.countByUserId.mockResolvedValue(0);
      savedPaymentMethodRepository.create.mockResolvedValue({ id: 'row_1' });

      await handlePaymentMethodAttached({ id: 'evt_1', data: stripePaymentMethod });

      expect(savedPaymentMethodRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', paymentMethodId: 'pm_1', isDefault: true })
      );
    });

    it('ignores events for unknown customers', async () => {
      identity.users.findUserIdByStripeCustomerId.mockResolvedValue(null);

      await handlePaymentMethodAttached({ id: 'evt_2', data: stripePaymentMethod });

      expect(savedPaymentMethodRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentMethodDetached', () => {
    it('deletes the mirror row', async () => {
      await handlePaymentMethodDetached({ id: 'evt_3', data: { id: 'pm_1' } });

      expect(savedPaymentMethodRepository.deleteByPaymentMethodId).toHaveBeenCalledWith('pm_1');
    });
  });

  describe('handleCustomerUpdated', () => {
    it('syncs the default flag from Stripe invoice settings', async () => {
      identity.users.findUserIdByStripeCustomerId.mockResolvedValue('u1');
      savedPaymentMethodRepository.findByUserId.mockResolvedValue([
        { stripe_payment_method_id: 'pm_1', is_default: false },
        { stripe_payment_method_id: 'pm_2', is_default: true },
      ]);

      await handleCustomerUpdated({
        id: 'evt_4',
        data: { id: 'cus_1', invoice_settings: { default_payment_method: 'pm_1' } },
      });

      expect(savedPaymentMethodRepository.updateByPaymentMethodId).toHaveBeenCalledWith('pm_1', {
        isDefault: true,
      });
      expect(savedPaymentMethodRepository.updateByPaymentMethodId).toHaveBeenCalledWith('pm_2', {
        isDefault: false,
      });
    });
  });
});
