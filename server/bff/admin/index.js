const express = require('express');

const reviewModule = require('@modules/review');
const inventoryModule = require('@modules/inventory');
const paymentModule = require('@modules/payment');
const bookingModule = require('@modules/booking');
const payoutModule = require('@modules/payout');
const meRoutes = require('./me.routes');

const router = express.Router();

/**
 * Admin BFF (back-office API).
 *
 * Thin edge layer for the admin channel. It mounts each module's admin router
 * and owns cross-domain composition. It must not contain domain business rules.
 *
 * Mounted at /api/v1/admin.
 */
router.use('/me', meRoutes);
router.use('/reviews', reviewModule.adminRoutes);
router.use('/inventory', inventoryModule.adminRoutes);
router.use('/payments', paymentModule.adminRoutes);
router.use('/bookings', bookingModule.adminRoutes);
router.use('/payouts', payoutModule.adminRoutes);

module.exports = router;
