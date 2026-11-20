jest.mock('@config/stripe.config', () => ({}));

const StripePaymentAdapter = require('@modules/payment/infrastructure/adapters/stripe-payment.adapter');
const StripeCustomerAdapter = require('@modules/payment/infrastructure/adapters/stripe-customer.adapter');

// The worker runs without Stripe credentials if the secret is not mounted.
// Every provider call must then fail with an explicit configuration error
// rather than `Cannot read properties of undefined (reading 'refunds')`.
describe('Stripe adapters without STRIPE_SECRET_KEY', () => {
  it('reports a missing provider client instead of a TypeError', async () => {
    const adapter = new StripePaymentAdapter();

    await expect(
      adapter.refundCharge({ chargeId: 'ch_1', amount: 100, idempotencyKey: 'refund-r1' })
    ).rejects.toMatchObject({ code: 'stripe_not_configured', permanent: true });

    await expect(adapter.getRefund('re_1')).rejects.toMatchObject({
      code: 'stripe_not_configured',
    });
  });

  it('guards the customer surface the same way', async () => {
    const adapter = new StripeCustomerAdapter();

    await expect(adapter.getPaymentMethod('pm_1')).rejects.toMatchObject({
      code: 'stripe_not_configured',
      permanent: true,
    });
  });
});
