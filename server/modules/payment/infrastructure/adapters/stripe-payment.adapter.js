const stripeConfig = require('@config/stripe.config');
const logger = require('@config/logger.config');

const StripeCustomerAdapter = require('./stripe-customer.adapter');
const { normalizeStripeError } = require('./stripe-error');

/**
 * Stripe payment adapter.
 *
 * Stripe is the only payment provider; this simply wraps the Stripe SDK so the
 * SDK specifics (amount units, status strings, error shapes) don't leak into
 * business code.
 *
 * Extends {@link StripeCustomerAdapter} so intents, refunds and the saved
 * customer/payment-method surface share one instance.
 */
class StripePaymentAdapter extends StripeCustomerAdapter {
  constructor() {
    super();
    this.webhookSecret = stripeConfig.webhookSecret;
  }

  /**
   * Create a Stripe payment intent
   */
  async createPayment(params) {
    const { amount, currency, paymentMethodId, customerId, metadata, returnUrl, offSession } =
      params;

    try {
      const intentParams = {
        amount: Math.round(amount), // Ensure integer
        currency: currency.toLowerCase(),
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      };

      if (customerId) {
        intentParams.customer = customerId;
      }

      if (paymentMethodId) {
        intentParams.payment_method = paymentMethodId;
        intentParams.confirm = true;
        intentParams.return_url = returnUrl;

        // Off-session reuse (merchant-initiated later payments) must opt in
        // explicitly; on-session checkout keeps 3DS available.
        if (offSession) {
          intentParams.off_session = true;
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create(intentParams);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: this.normalizeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        provider: 'stripe',
        raw: paymentIntent,
      };
    } catch (error) {
      logger.error('Stripe payment creation failed:', error);
      throw normalizeStripeError(error);
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        id: paymentIntent.id,
        status: this.normalizeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        provider: 'stripe',
        raw: paymentIntent,
      };
    } catch (error) {
      logger.error('Stripe payment retrieval failed:', error);
      throw normalizeStripeError(error);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentId);

      return {
        id: paymentIntent.id,
        status: this.normalizeStatus(paymentIntent.status),
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe payment cancellation failed:', error);
      throw normalizeStripeError(error);
    }
  }

  /**
   * Create a refund
   */
  async refundPayment(params) {
    const { paymentId, amount, reason } = params;

    try {
      // Get the charge ID from payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      const chargeId = paymentIntent.latest_charge;

      if (!chargeId) {
        throw new Error('No charge found for this payment intent');
      }

      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount) : undefined, // Partial or full refund
        reason: reason || 'requested_by_customer',
        metadata: {
          payment_intent_id: paymentId,
        },
      });

      return {
        id: refund.id,
        paymentId: paymentId,
        amount: refund.amount,
        currency: refund.currency,
        status: this.normalizeRefundStatus(refund.status),
        provider: 'stripe',
        raw: refund,
      };
    } catch (error) {
      logger.error('Stripe refund creation failed:', error);
      throw normalizeStripeError(error);
    }
  }

  /**
   * Create a refund directly against a charge.
   * Preferred for admin-initiated refunds: no extra payment-intent lookup.
   */
  async refundCharge(params) {
    const { chargeId, amount, reason, metadata } = params;

    try {
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount) : undefined,
        reason: reason || 'requested_by_customer',
        metadata: metadata || {},
      });

      return {
        id: refund.id,
        chargeId,
        amount: refund.amount,
        currency: refund.currency,
        status: this.normalizeRefundStatus(refund.status),
        provider: 'stripe',
        raw: refund,
      };
    } catch (error) {
      logger.error('Stripe charge refund failed:', error);
      throw normalizeStripeError(error);
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhook(payload, signature) {
    try {
      if (!this.webhookSecret) {
        // Fail closed in production: without a secret we cannot authenticate
        // the sender, so accepting the payload would let anyone forge events.
        if (process.env.NODE_ENV === 'production') {
          logger.error('Stripe webhook secret not configured; rejecting webhook in production');
          throw new Error('Webhook signature verification failed');
        }
        logger.warn('Stripe webhook secret not configured, skipping verification (non-production)');
        return JSON.parse(payload.toString());
      }

      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        // For Connect events this is the connected account id (`acct_…`); it is
        // null for platform-account events. Handlers use it to tell the two
        // apart and to attribute connected-account events.
        account: event.account || null,
        created: event.created,
        provider: 'stripe',
        raw: event,
      };
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Normalize Stripe payment status to common status
   */
  normalizeStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'cancelled',
      succeeded: 'succeeded',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  /**
   * Normalize Stripe refund status
   */
  normalizeRefundStatus(stripeStatus) {
    const statusMap = {
      pending: 'processing',
      succeeded: 'succeeded',
      failed: 'failed',
      canceled: 'cancelled',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }
}

module.exports = StripePaymentAdapter;
