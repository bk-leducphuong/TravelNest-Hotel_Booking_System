const paymentModule = {
  handlePaymentSucceeded: require('../application/webhooks/handlePaymentSucceeded')
    .handlePaymentSucceeded,
  handlePaymentFailed: require('../application/webhooks/handlePaymentFailed').handlePaymentFailed,
  handleRefundSucceeded: require('../application/webhooks/handleRefundSucceeded')
    .handleRefundSucceeded,
  handlePaymentMethodAttached: require('../application/webhooks/handlePaymentMethodAttached')
    .handlePaymentMethodAttached,
  handlePaymentMethodUpdated: require('../application/webhooks/handlePaymentMethodUpdated')
    .handlePaymentMethodUpdated,
  handlePaymentMethodDetached: require('../application/webhooks/handlePaymentMethodDetached')
    .handlePaymentMethodDetached,
  handleCustomerUpdated: require('../application/webhooks/handleCustomerUpdated')
    .handleCustomerUpdated,
  webhookEventLog: require('../infrastructure/webhook-event-log'),
};
const emailPublisher = require('@platform/events/producers/email');
const notificationPublisher = require('@platform/events/producers/notification');
const { publish, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');
const StripeWebhookAdapter = require('../infrastructure/adapters/stripe-webhook.adapter');
const StripePaymentAdapter = require('../infrastructure/adapters/stripe-payment.adapter');

// Initialize adapters
const paymentAdapter = new StripePaymentAdapter();
const webhookAdapter = new StripeWebhookAdapter(paymentAdapter, paymentModule.webhookEventLog);

/**
 * Main webhook handler
 * POST /api/webhooks/stripe
 */
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.body;

  let event;
  let claimed = false;
  try {
    // 1. Verify and parse webhook (adapter's job)
    event = await webhookAdapter.verifyAndParse(rawBody, signature);

    const claim = await paymentModule.webhookEventLog.claim(event);
    if (claim === 'processed') return res.status(200).json({ received: true, duplicate: true });
    if (claim === 'busy')
      return res.status(503).json({ error: 'Webhook processing in progress; retry later' });
    claimed = true;

    // 4. Route to appropriate handler
    await routeWebhookEvent(event);

    await paymentModule.webhookEventLog.updateStatus(event.id, 'processed');

    // 5. Return success response
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed:', error);

    // Return appropriate HTTP status
    if (error.message.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (claimed && event?.id) {
      await paymentModule.webhookEventLog.updateStatus(event.id, 'failed', error.message);
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Route webhook events to appropriate handlers
 */
async function routeWebhookEvent(event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event);
      break;

    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed':
    case 'charge.refund.updated':
      await paymentModule.handleRefundSucceeded({ refundId: event.data.id });
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event);
      break;

    case 'payout.paid':
      await handlePayoutPaid(event);
      break;

    case 'payout.failed':
      await handlePayoutFailed(event);
      break;

    // Stripe Connect: connected-account status changes (onboarding, requirements).
    case 'account.updated':
      await handleAccountUpdated(event);
      break;

    // Stripe Connect: transfers to a connected account.
    case 'transfer.created':
    case 'transfer.updated':
    case 'transfer.reversed':
      await handleTransferUpdated(event);
      break;

    // Saved payment methods (account settings) — keep the local mirror honest.
    case 'payment_method.attached':
      await paymentModule.handlePaymentMethodAttached(event);
      break;

    case 'payment_method.updated':
      await paymentModule.handlePaymentMethodUpdated(event);
      break;

    case 'payment_method.detached':
      await paymentModule.handlePaymentMethodDetached(event);
      break;

    case 'customer.updated':
      await paymentModule.handleCustomerUpdated(event);
      break;

    default:
      logger.info('Unhandled webhook event type', { eventType: event.type });
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentSucceeded(event) {
  logger.info('Handling payment_intent.succeeded', { eventId: event.id });

  try {
    let context = webhookAdapter.extractPaymentSucceededContext(event);
    context = await webhookAdapter.enrichWithPaymentMethod(context);

    const result = await paymentModule.handlePaymentSucceeded(context);

    if (!result.alreadyProcessed) {
      // Enqueue email and notification in parallel (independent queues)
      const bookingCode = context.bookingCode || context.paymentIntentId;
      const eventId = event.id;
      await Promise.all([
        context.receiptEmail
          ? emailPublisher.publishBookingConfirmation(context, {
              sourceEventId: eventId,
            })
          : Promise.resolve(),
        notificationPublisher.publishPaymentSucceeded(context, { sourceEventId: eventId }),
      ]);
    }

    logger.info('Payment succeeded handled successfully', {
      eventId: event.id,
      bookingCode: context.bookingCode,
    });
  } catch (error) {
    logger.error('Error handling payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentFailed(event) {
  logger.info('Handling payment_intent.payment_failed', { eventId: event.id });

  try {
    let context = webhookAdapter.extractPaymentFailedContext(event);
    context = await webhookAdapter.enrichWithPaymentMethod(context);

    await paymentModule.handlePaymentFailed(context);

    if (context.receiptEmail) {
      await emailPublisher.publishPaymentFailure(context, {
        sourceEventId: event.id,
      });
    }

    logger.info('Payment failed handled successfully', { eventId: event.id });
  } catch (error) {
    logger.error('Error handling payment failed:', error);
    throw error;
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event) {
  // Charge payloads can contain a truncated list. Reconcile every provider refund.
  for (const refundId of await paymentAdapter.listRefundsForCharge(event.data.id)) {
    await paymentModule.handleRefundSucceeded({ refundId });
  }
}

/**
 * Handle payout.paid event
 */
async function handlePayoutPaid(event) {
  logger.info('Handling payout.paid', { eventId: event.id });

  try {
    const context = webhookAdapter.extractPayoutContext(event);

    await notificationPublisher.publishPayoutCompleted(context, {
      sourceEventId: event.id,
    });

    logger.info('Payout paid handled successfully', { eventId: event.id });
  } catch (error) {
    logger.error('Error handling payout paid:', error);
    throw error;
  }
}

/**
 * Handle payout.failed event
 */
async function handlePayoutFailed(event) {
  logger.info('Handling payout.failed', { eventId: event.id });

  try {
    const context = webhookAdapter.extractPayoutContext(event);

    await notificationPublisher.publishPayoutFailed(context, {
      sourceEventId: event.id,
    });

    logger.info('Payout failed handled successfully', { eventId: event.id });
  } catch (error) {
    logger.error('Error handling payout failed:', error);
    throw error;
  }
}

/**
 * Handle account.updated (Stripe Connect).
 *
 * `event.data` is the Stripe Account object and `event.account` its id. We
 * publish a domain event rather than writing here, so the payment module never
 * reaches into the payout module's tables — the payout module owns the subscriber.
 */
async function handleAccountUpdated(event) {
  logger.info('Handling account.updated', { eventId: event.id, account: event.account });

  await publish(DOMAIN_EVENTS.CONNECT_ACCOUNT_UPDATED, {
    providerAccountId: event.account || null,
    stripeAccount: event.data,
  });
}

/**
 * Handle Connect transfer events (created / updated / reversed) so the payout
 * row is reconciled even if the original `transfers.create` response was lost.
 */
async function handleTransferUpdated(event) {
  logger.info('Handling Connect transfer event', { eventId: event.id, eventType: event.type });

  await publish(DOMAIN_EVENTS.CONNECT_TRANSFER_UPDATED, {
    providerAccountId: event.account || null,
    eventType: event.type,
    transfer: event.data,
  });
}

module.exports = {
  handleStripeWebhook,
};
