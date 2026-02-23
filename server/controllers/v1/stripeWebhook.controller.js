const paymentService = require('@services/payment.service');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const StripeWebhookAdapter = require('@adapters/webhooks/stripeWebhook.adapter');
const webhookEventLogRepository = require('@repositories/webhook_event_log.repository');
const { paymentNotificationQueue } = require('@queues/index');
const { addJob } = require('@utils/bullmq.utils');
const logger = require('@config/logger.config');

/**
 * Stripe Webhook Controller
 * Responsibilities:
 * - Receive HTTP webhook requests
 * - Delegate to webhook adapter for verification/parsing
 * - Route events to appropriate business handlers
 * - Send HTTP responses
 */

// Initialize adapters
const paymentAdapter = new StripePaymentAdapter();
const webhookAdapter = new StripeWebhookAdapter(
  paymentAdapter,
  webhookEventLogRepository
);

/**
 * Main webhook handler
 * POST /api/webhooks/stripe
 */
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.body;

  try {
    // 1. Verify and parse webhook (adapter's job)
    const event = await webhookAdapter.verifyAndParse(rawBody, signature);

    // 2. Check for duplicate events (idempotency)
    const isDuplicate = await webhookAdapter.isDuplicate(event.id);
    if (isDuplicate) {
      logger.info('Duplicate webhook event received', { eventId: event.id });
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 3. Log event for audit trail
    await webhookAdapter.logEvent(event.id, event.type, event.raw);

    // 4. Route to appropriate handler
    await routeWebhookEvent(event);

    // 5. Return success response
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed:', error);

    // Return appropriate HTTP status
    if (error.message.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
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

    case 'charge.refunded':
      await handleChargeRefunded(event);
      break;

    case 'payout.paid':
      await handlePayoutPaid(event);
      break;

    case 'payout.failed':
      await handlePayoutFailed(event);
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

    const result = await paymentService.handlePaymentSucceeded(context);

    if (!result.alreadyProcessed) {
      await addJob(
        paymentNotificationQueue,
        'payment-success',
        {
          type: 'payment_success',
          context: {
            ...context,
            eventId: event.id,
          },
        },
        {
          priority: 8,
          jobId: `payment-success-${context.bookingCode || context.paymentIntentId}-${event.id}`,
        }
      );
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

    await paymentService.handlePaymentFailed(context);

    await addJob(
      paymentNotificationQueue,
      'payment-failure',
      {
        type: 'payment_failure',
        context: {
          ...context,
          eventId: event.id,
        },
      },
      {
        priority: 5,
        jobId: `payment-failure-${context.paymentIntentId}-${event.id}`,
      }
    );

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
  logger.info('Handling charge.refunded', { eventId: event.id });

  try {
    const context = webhookAdapter.extractRefundContext(event);

    await paymentService.handleRefundSucceeded(context);

    await addJob(
      paymentNotificationQueue,
      'refund',
      {
        type: 'refund',
        context: {
          ...context,
          eventId: event.id,
        },
      },
      {
        priority: 7,
        jobId: `refund-${context.bookingCode || context.refundId || context.chargeId}-${event.id}`,
      }
    );

    logger.info('Refund handled successfully', {
      eventId: event.id,
      bookingCode: context.bookingCode,
    });
  } catch (error) {
    logger.error('Error handling refund:', error);
    throw error;
  }
}

/**
 * Handle payout.paid event
 */
async function handlePayoutPaid(event) {
  logger.info('Handling payout.paid', { eventId: event.id });

  try {
    const context = webhookAdapter.extractPayoutContext(event);

    await addJob(
      paymentNotificationQueue,
      'payout-completed',
      {
        type: 'payout',
        status: 'completed',
        context: {
          ...context,
          eventId: event.id,
        },
      },
      {
        priority: 5,
        jobId: `payout-completed-${context.transactionId || context.payoutId}-${event.id}`,
      }
    );

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

    await addJob(
      paymentNotificationQueue,
      'payout-failed',
      {
        type: 'payout',
        status: 'failed',
        context: {
          ...context,
          eventId: event.id,
        },
      },
      {
        priority: 5,
        jobId: `payout-failed-${context.transactionId || context.payoutId}-${event.id}`,
      }
    );

    logger.info('Payout failed handled successfully', { eventId: event.id });
  } catch (error) {
    logger.error('Error handling payout failed:', error);
    throw error;
  }
}

module.exports = {
  handleStripeWebhook,
};
