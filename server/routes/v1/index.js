/**
 * API v1 Routes Index
 * Exports all v1 routes
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const adminBff = require('@bff/admin');
const reviewModule = require('@modules/review');
const identityModule = require('@modules/identity');
const mediaModule = require('@modules/media');
const analyticsModule = require('@modules/analytics');
const onboardingModule = require('@modules/onboarding');
const notificationModule = require('@modules/notification');
const catalogModule = require('@modules/catalog');
const bookingModule = require('@modules/booking');
const paymentModule = require('@modules/payment');
const searchModule = require('@modules/search');
const internalSuperadminRoutes = require('@platform/internal/api/internalSuperadmin.routes');

// Mount all routes
router.use('/search', searchModule.guestRoutes);
router.use('/hotels', catalogModule.guestRoutes);
router.use('/analytics', analyticsModule.analyticsRoutes);
router.use('/images', mediaModule.imageRoutes);
router.use('/auth', identityModule.authRoutes);
router.use('/join', onboardingModule.joinRoutes);
router.use('/payments', paymentModule.guestRoutes);
router.use('/user', identityModule.userRoutes);
router.use('/reviews', reviewModule.guestRoutes);
router.use('/bookings', bookingModule.guestRoutes);
router.use('/hold', bookingModule.holdRoutes);
router.use('/notifications', notificationModule.notificationRoutes);
router.use('/internal/superadmin', internalSuperadminRoutes);
router.use('/admin', adminBff);

module.exports = router;
