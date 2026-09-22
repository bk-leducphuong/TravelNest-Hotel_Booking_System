/**
 * API v1 Routes Index
 * Exports all v1 routes
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const adminBff = require('@bff/admin');
const reviewModule = require('@modules/review');
const authRoutes = require('./auth.routes');
const analyticsRoutes = require('./analytics.routes');
const bookingRoutes = require('./booking.routes');
const holdRoutes = require('./hold.routes');
const hotelRoutes = require('./hotel.routes');
const imageRoutes = require('./image.routes');
const joinRoutes = require('./join.routes');
const notificationRoutes = require('./notification.routes');
const paymentRoutes = require('./payment.routes');
const searchRoutes = require('./search.routes');
const userRoutes = require('./user.routes');
const internalSuperadminRoutes = require('./internalSuperadmin.routes');

// Mount all routes
router.use('/search', searchRoutes);
router.use('/hotels', hotelRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/images', imageRoutes);
router.use('/auth', authRoutes);
router.use('/join', joinRoutes);
router.use('/payments', paymentRoutes);
router.use('/user', userRoutes);
router.use('/reviews', reviewModule.guestRoutes);
router.use('/bookings', bookingRoutes);
router.use('/hold', holdRoutes);
router.use('/notifications', notificationRoutes);
router.use('/internal/superadmin', internalSuperadminRoutes);
router.use('/admin', adminBff);

module.exports = router;
