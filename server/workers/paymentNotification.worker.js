require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const notificationService = require('@services/notification.service');
const emailService = require('@services/email.service');
const inventoryService = require('@services/inventory.service');

const queueName = 'paymentNotification';

async function handlePaymentSuccess(context) {
  if (context.receiptEmail) {
    await emailService.sendBookingConfirmation({
      email: context.receiptEmail,
      bookingCode: context.bookingCode,
      checkInDate: context.checkInDate,
      checkOutDate: context.checkOutDate,
      numberOfGuests: context.numberOfGuests,
      totalPrice: context.amount,
    });
  }

  await notificationService.sendNewBookingNotification({
    buyerId: context.buyerId,
    hotelId: context.hotelId,
    bookingCode: context.bookingCode,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
    numberOfGuests: context.numberOfGuests,
    bookedRooms: context.bookedRooms,
  });

  await inventoryService.reserveRooms({
    bookedRooms: context.bookedRooms,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
  });

  logger.info('Payment success notifications processed in worker', {
    bookingCode: context.bookingCode,
  });
}

async function handlePaymentFailure(context) {
  if (context.receiptEmail) {
    await emailService.sendPaymentFailure({
      email: context.receiptEmail,
      failureMessage: context.failureMessage,
    });
  }

  logger.info('Payment failure notifications processed in worker', {
    buyerId: context.buyerId,
  });
}

async function handleRefund(context) {
  await inventoryService.releaseRooms({
    bookedRooms: context.bookedRooms,
    checkInDate: context.checkInDate,
    checkOutDate: context.checkOutDate,
  });

  await notificationService.sendRefundNotification({
    buyerId: context.buyerId,
    hotelId: context.hotelId,
    bookingCode: context.bookingCode,
    refundAmount: context.refundAmount,
  });

  logger.info('Refund notifications processed in worker', {
    bookingCode: context.bookingCode,
  });
}

async function handlePayout(context, status) {
  await notificationService.sendPayoutNotification({
    hotelId: context.hotelId,
    transactionId: context.transactionId,
    status,
    amount: context.amount,
  });

  logger.info('Payout notifications processed in worker', {
    hotelId: context.hotelId,
    status,
  });
}

const processPaymentNotificationJob = async (job) => {
  const { type, context, status } = job.data;

  logger.info(
    {
      type,
      jobId: job.id,
      eventId: context?.eventId,
    },
    '[Worker] Processing payment notification job'
  );

  switch (type) {
    case 'payment_success':
      await handlePaymentSuccess(context);
      break;

    case 'payment_failure':
      await handlePaymentFailure(context);
      break;

    case 'refund':
      await handleRefund(context);
      break;

    case 'payout':
      await handlePayout(context, status);
      break;

    default:
      logger.warn('Unknown payment notification job type', {
        type,
        jobId: job.id,
      });
  }

  return { success: true, type };
};

const paymentNotificationWorker = new Worker(
  queueName,
  processPaymentNotificationJob,
  {
    ...config.workerOptions,
    concurrency: parseInt(
      process.env.BULLMQ_PAYMENT_NOTIFICATION_CONCURRENCY || '10',
      10
    ),
  }
);

paymentNotificationWorker.on('completed', (job) => {
  logger.info(
    {
      jobId: job.id,
      duration: Date.now() - job.timestamp,
    },
    `Payment notification job completed: ${job.id}`
  );
});

paymentNotificationWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      errorCode: err.code,
      errorType: err.type,
      stack: err.stack,
      attemptsMade: job?.attemptsMade,
      jobData: job?.data,
    },
    `Payment notification job failed: ${job?.id} - ${err.message}`
  );
});

paymentNotificationWorker.on('error', (err) => {
  logger.error('Payment notification worker error:', err);
});

paymentNotificationWorker.on('active', (job) => {
  logger.debug(
    { jobId: job.id },
    `Payment notification job started: ${job.id}`
  );
});

module.exports = paymentNotificationWorker;
