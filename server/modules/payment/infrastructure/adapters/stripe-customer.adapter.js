const stripeConfig = require('@config/stripe.config');
const logger = require('@config/logger.config');

const { normalizeStripeError } = require('./stripe-error');

/**
 * Stripe customer / payment-method adapter.
 *
 * Wraps the parts of the Stripe SDK that back saved payment methods: the
 * customer that owns them, SetupIntents that attach them, and the
 * PaymentMethod list/detach surface. The Stripe SDK types never leak past here.
 *
 * `StripePaymentAdapter` extends this class, so a single adapter instance
 * exposes both the intent/refund surface and the customer surface.
 */
class StripeCustomerAdapter {
  constructor() {
    this.stripe = stripeConfig.client || null;
  }

  /**
   * Return the Stripe SDK client.
   *
   * Missing credentials are a deployment error, not a provider error: without
   * this guard every call surfaces as an opaque
   * `Cannot read properties of undefined (reading 'refunds')`, which hides the
   * real cause from operators and from the refund worker's failure codes.
   */
  getClient() {
    if (!this.stripe) {
      const error = new Error(
        'Stripe is not configured: STRIPE_SECRET_KEY is missing from this process environment'
      );
      error.code = 'stripe_not_configured';
      // Nothing was sent to Stripe, so retrying cannot recover on its own.
      error.permanent = true;
      throw error;
    }
    return this.stripe;
  }

  /**
   * Normalize a Stripe PaymentMethod into the shape used across the app.
   */
  normalizePaymentMethod(paymentMethod) {
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      customerId: paymentMethod.customer || null,
      card: paymentMethod.card
        ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
          }
        : null,
      billingDetails: paymentMethod.billing_details,
      provider: 'stripe',
      raw: paymentMethod,
    };
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.getClient().paymentMethods.retrieve(paymentMethodId);

      return this.normalizePaymentMethod(paymentMethod);
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe payment method retrieval failed'
      );
      throw normalizeStripeError(error);
    }
  }

  /**
   * Create a Stripe customer to hold a user's saved payment methods.
   */
  async createCustomer({ email, name, metadata } = {}) {
    try {
      const customer = await this.getClient().customers.create({
        email: email || undefined,
        name: name || undefined,
        metadata: metadata || {},
      });

      return { id: customer.id, email: customer.email, provider: 'stripe' };
    } catch (error) {
      logger.error({ error: error.message, code: error.code }, 'Stripe customer creation failed');
      throw normalizeStripeError(error);
    }
  }

  /**
   * Retrieve a Stripe customer.
   */
  async getCustomer(customerId) {
    try {
      const customer = await this.getClient().customers.retrieve(customerId);

      return {
        id: customer.id,
        email: customer.email,
        defaultPaymentMethodId:
          customer.invoice_settings?.default_payment_method || customer.default_source || null,
        deleted: Boolean(customer.deleted),
        provider: 'stripe',
      };
    } catch (error) {
      logger.error({ error: error.message, code: error.code }, 'Stripe customer retrieval failed');
      throw normalizeStripeError(error);
    }
  }

  /**
   * Set the customer's default payment method (canonical store for "default").
   */
  async updateCustomerDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      const customer = await this.getClient().customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId || null },
      });

      return {
        id: customer.id,
        defaultPaymentMethodId: customer.invoice_settings?.default_payment_method || null,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe customer default update failed'
      );
      throw normalizeStripeError(error);
    }
  }

  /**
   * Create a SetupIntent so the client can attach a card to the customer.
   */
  async createSetupIntent({ customerId, metadata } = {}) {
    try {
      const setupIntent = await this.getClient().setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: metadata || {},
      });

      return {
        id: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status,
        customerId: setupIntent.customer || customerId,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe setup intent creation failed'
      );
      throw normalizeStripeError(error);
    }
  }

  /**
   * Retrieve a SetupIntent (used to verify the card belongs to our customer).
   */
  async getSetupIntent(setupIntentId) {
    try {
      const setupIntent = await this.getClient().setupIntents.retrieve(setupIntentId);

      return {
        id: setupIntent.id,
        status: setupIntent.status,
        customerId: setupIntent.customer || null,
        paymentMethodId: setupIntent.payment_method || null,
        provider: 'stripe',
        raw: setupIntent,
      };
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe setup intent retrieval failed'
      );
      throw normalizeStripeError(error);
    }
  }

  /**
   * List the card payment methods attached to a customer.
   */
  async listPaymentMethods(customerId) {
    try {
      const result = await this.getClient().paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return result.data.map((paymentMethod) => this.normalizePaymentMethod(paymentMethod));
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe payment method listing failed'
      );
      throw normalizeStripeError(error);
    }
  }

  /**
   * Detach a payment method from its customer.
   */
  async detachPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.getClient().paymentMethods.detach(paymentMethodId);

      return {
        id: paymentMethod.id,
        customerId: paymentMethod.customer || null,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error(
        { error: error.message, code: error.code },
        'Stripe payment method detach failed'
      );
      throw normalizeStripeError(error);
    }
  }
}

module.exports = StripeCustomerAdapter;
