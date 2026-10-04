const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');
const bookingModule = require('@modules/booking');
const inventoryModule = require('@modules/inventory');

const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const transactionRepository = require('../../infrastructure/transaction.repository');

const { toMinorUnits } = require('../../domain/money');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Create a payment intent based on the user's current active hold.
 *
 * Within one DB transaction: release held rooms + complete the hold, reserve
 * the rooms for the booking, create pending booking rows, create the provider
 * payment intent and the pending transaction.
 *
 * @param {number} userId
 * @param {{ paymentMethodId: string }} paymentData
 */
async function createPaymentIntent(userId, paymentData) {
  const { paymentMethodId } = paymentData;

  if (!paymentMethodId) {
    throw new ApiError(400, 'MISSING_REQUIRED_FIELDS', 'paymentMethodId is required');
  }

  // 1. Find active hold for user
  const activeHolds = await bookingModule.hold.getActiveHoldsByUser(userId);

  if (!activeHolds || activeHolds.length === 0) {
    throw new ApiError(
      400,
      'NO_ACTIVE_HOLD',
      'No active hold found for this user. Please create a hold before starting payment.'
    );
  }

  const hold = activeHolds[0];
  const holdData = hold.toJSON ? hold.toJSON() : hold;

  if (new Date(holdData.expires_at) <= new Date()) {
    throw new ApiError(
      400,
      'HOLD_EXPIRED',
      'Your room hold has expired. Please start a new booking.'
    );
  }

  const rooms =
    (holdData.holdRooms || hold.holdRooms || []).map((holdRoom) => ({
      roomId: holdRoom.room_id,
      quantity: holdRoom.quantity,
    })) || [];

  if (rooms.length === 0) {
    throw new ApiError(400, 'HOLD_HAS_NO_ROOMS', 'Active hold does not contain any rooms.');
  }

  const bookingCode = bookingModule.generateBookingCode();
  const holdCurrency = 'USD';
  const amount = parseFloat(holdData.total_price);
  const paymentWindowMinutes = parseInt(process.env.BOOKING_PAYMENT_WINDOW_MINUTES || '15', 10);
  const paymentDueAt = new Date(Date.now() + paymentWindowMinutes * 60 * 1000);

  if (!amount || amount <= 0) {
    throw new ApiError(400, 'INVALID_HOLD_AMOUNT', 'Hold total price is invalid.');
  }

  const transaction = await sequelize.transaction();

  try {
    const checkInDate = holdData.check_in_date;
    const checkOutDate = holdData.check_out_date;
    const numberOfGuests = holdData.number_of_guests;

    // 2. Release hold (held rooms + hold status) inside this transaction
    await bookingModule.hold.releaseHold(holdData.id, userId, 'completed', { transaction });

    const bookedRooms = rooms.map((room) => ({
      room_id: room.roomId,
      roomQuantity: room.quantity,
    }));

    // 3. Reserve rooms for the booking
    await inventoryModule.reserveRooms({ bookedRooms, checkInDate, checkOutDate }, { transaction });

    // 4. Create pending bookings linked to this hold
    let primaryBooking = null;
    for (const room of rooms) {
      const booking = await bookingModule.createBooking(
        {
          buyer_id: userId,
          hotel_id: holdData.hotel_id,
          room_id: room.roomId,
          hold_id: holdData.id,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          total_price: amount,
          currency: holdCurrency,
          status: 'pending_payment',
          number_of_guests: numberOfGuests,
          quantity: room.quantity,
          booking_code: bookingCode,
          payment_due_at: paymentDueAt,
          expires_at: paymentDueAt,
        },
        { transaction }
      );

      if (!primaryBooking) {
        primaryBooking = booking;
      }
    }

    // 5. Create payment intent through the provider
    const payment = await stripeAdapter.createPayment({
      amount: toMinorUnits(amount, holdCurrency),
      currency: holdCurrency,
      paymentMethodId,
      returnUrl: process.env.CLIENT_HOST
        ? `${process.env.CLIENT_HOST}/book/complete`
        : 'http://localhost:5173/book/complete',
      metadata: {
        booking_code: bookingCode,
        booking_id: primaryBooking.id,
        hotel_id: holdData.hotel_id.toString(),
        buyer_id: userId.toString(),
        booked_rooms: JSON.stringify(bookedRooms),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: numberOfGuests.toString(),
      },
    });

    await transactionRepository.create(
      {
        bookingId: primaryBooking.id,
        buyerId: userId,
        hotelId: holdData.hotel_id,
        amount,
        currency: holdCurrency,
        status: 'pending',
        transactionType: 'payment',
        paymentIntentId: payment.id,
        paymentMethod: 'card',
        metadata: {
          booking_code: bookingCode,
          hold_id: holdData.id,
        },
      },
      { transaction }
    );

    await transaction.commit();

    logger.info('Payment intent created from hold', {
      paymentId: payment.id,
      userId,
      holdId: holdData.id,
      bookingCode,
      amount,
      provider: payment.provider,
    });

    return {
      clientSecret: payment.clientSecret,
      paymentIntentId: payment.id,
      status: payment.status,
      bookingCode,
      paymentDueAt,
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to create payment intent from hold:', error);
    throw new ApiError(
      error.statusCode || 500,
      error.code || 'PAYMENT_CREATION_FAILED',
      error.message
    );
  }
}

module.exports = { createPaymentIntent };
