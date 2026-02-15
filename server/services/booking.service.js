const bookingRepository = require('@repositories/booking.repository');
const ApiError = require('@utils/ApiError');

class BookingService {
  /**
   * Get all bookings for a user
   * Automatically updates booking status based on dates
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeCancelled - Include cancelled bookings (default: false)
   * @returns {Promise<Array>} Array of bookings with hotel and room information
   */
  async getUserBookings(userId, options = {}) {
    const { includeCancelled = false } = options;

    // Update booking statuses based on current date
    await bookingRepository.updateStatusByDates(userId);

    // Get bookings
    const bookings = await bookingRepository.findByBuyerId(userId, {
      excludeCancelled: !includeCancelled,
    });

    // Enrich with hotel and room information
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingData = booking.toJSON ? booking.toJSON() : booking;

        // Get hotel information
        const hotel = await bookingRepository.findHotelById(
          bookingData.hotel_id
        );

        // Get room information
        const room = await bookingRepository.findRoomById(bookingData.room_id);

        return {
          ...bookingData,
          hotel: hotel ? (hotel.toJSON ? hotel.toJSON() : hotel) : null,
          room: room
            ? {
                room_id: room.id,
                room_name: room.room_name,
              }
            : null,
        };
      })
    );

    return enrichedBookings;
  }

  /**
   * Get a specific booking by ID
   * @param {number} bookingId - Booking ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Booking details
   */
  async getBookingById(bookingId, userId) {
    const booking = await bookingRepository.findByIdAndBuyerId(
      bookingId,
      userId
    );

    if (!booking) {
      throw new ApiError(
        404,
        'BOOKING_NOT_FOUND',
        'Booking not found or you do not have permission to view it'
      );
    }

    // Get hotel and room information
    const hotel = await bookingRepository.findHotelById(booking.hotel_id);
    const room = await bookingRepository.findRoomById(booking.room_id);

    const bookingData = booking.toJSON ? booking.toJSON() : booking;

    return {
      ...bookingData,
      hotel: hotel ? (hotel.toJSON ? hotel.toJSON() : hotel) : null,
      room: room
        ? {
            room_id: room.id,
            room_name: room.room_name,
          }
        : null,
    };
  }

  /**
   * Cancel a booking
   * @param {number} bookingId - Booking ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} options - Cancellation options
   * @param {boolean} options.processRefund - Process refund via Stripe (default: false)
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelBooking(bookingId, userId, options = {}) {
    const { processRefund = false } = options;

    // Find booking and verify ownership
    const booking = await bookingRepository.findByIdAndBuyerId(
      bookingId,
      userId
    );

    if (!booking) {
      throw new ApiError(
        404,
        'BOOKING_NOT_FOUND',
        'Booking not found or you do not have permission to cancel it'
      );
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      throw new ApiError(
        400,
        'ALREADY_CANCELLED',
        'Booking is already cancelled'
      );
    }

    if (booking.status === 'completed') {
      throw new ApiError(
        400,
        'CANNOT_CANCEL_COMPLETED',
        'Cannot cancel a completed booking'
      );
    }

    // Process refund if requested
    let refundResult = null;
    if (processRefund) {
      try {
        refundResult = await this.processRefund(booking);
      } catch (error) {
        // Log error but don't fail cancellation
        console.error('Refund processing failed:', error);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status to cancelled
    const [updatedCount] = await bookingRepository.updateStatus(
      bookingId,
      'cancelled'
    );

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to cancel booking');
    }

    return {
      bookingId,
      bookingCode: booking.booking_code,
      message: 'Booking cancelled successfully',
      refundProcessed: !!refundResult,
      refund: refundResult,
    };
  }

  /**
   * Process refund for a booking
   * @param {Object} booking - Booking object
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(booking) {
    // Find transaction
    const transaction = await bookingRepository.findTransactionByBookingCode(
      booking.booking_code
    );

    if (!transaction) {
      throw new ApiError(
        404,
        'TRANSACTION_NOT_FOUND',
        'Transaction not found for this booking'
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ApiError(
        500,
        'STRIPE_NOT_CONFIGURED',
        'Stripe is not configured. Cannot process refund.'
      );
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Process refund via Stripe
    const refund = await stripe.refunds.create({
      charge: transaction.charge_id,
      amount: Math.round(parseFloat(transaction.amount) * 100), // Convert to cents
    });

    // Create refund record in database
    const refundRecord = await bookingRepository.createRefund({
      transactionId: transaction.transaction_id,
      buyerId: booking.buyer_id,
      hotelId: booking.hotel_id,
      amount: transaction.amount,
      status: refund.status === 'succeeded' ? 'completed' : 'pending',
    });

    return {
      refundId: refund.id,
      amount: parseFloat(transaction.amount),
      status: refund.status,
      refundRecordId: refundRecord.refund_id,
    };
  }

  /**
   * Get booking by booking code
   * @param {string} bookingCode - Booking code
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Booking details
   */
  async getBookingByCode(bookingCode, userId) {
    const booking = await bookingRepository.findByBookingCode(bookingCode);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    if (booking.buyer_id !== userId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view this booking'
      );
    }

    // Get hotel and room information
    const hotel = await bookingRepository.findHotelById(booking.hotel_id);
    const room = await bookingRepository.findRoomById(booking.room_id);

    const bookingData = booking.toJSON ? booking.toJSON() : booking;

    return {
      ...bookingData,
      hotel: hotel ? (hotel.toJSON ? hotel.toJSON() : hotel) : null,
      room: room
        ? {
            room_id: room.id,
            room_name: room.room_name,
          }
        : null,
    };
  }
}

module.exports = new BookingService();
