/**
 * API v1 Routes Index
 * Exports all v1 routes
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');
const homeRoutes = require('./home.routes');
const holdRoutes = require('./hold.routes');
const hotelRoutes = require('./hotel.routes');
const imageRoutes = require('./image.routes');
const joinRoutes = require('./join.routes');
const notificationRoutes = require('./notification.routes');
const paymentRoutes = require('./payment.routes');
const reviewRoutes = require('./review.routes');
const searchRoutes = require('./search.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin/index');

// Mount all routes
router.use('/search', searchRoutes);
router.use('/home', homeRoutes);
router.use('/hotels', hotelRoutes);
router.use('/images', imageRoutes);
router.use('/auth', authRoutes);
router.use('/join', joinRoutes);
router.use('/payments', paymentRoutes);
router.use('/user', userRoutes);
router.use('/reviews', reviewRoutes);
router.use('/bookings', bookingRoutes);
router.use('/hold', holdRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
