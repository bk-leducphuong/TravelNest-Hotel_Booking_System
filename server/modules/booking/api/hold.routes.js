/**
 * Hold API - Temporarily hold rooms during checkout
 * Prevents other users from booking the same room while the user completes payment.
 */

const express = require('express');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const holdSchema = require('./hold.schema');
const { createHold, getMyHolds, getHoldById, releaseHold } = require('./hold.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(holdSchema.createHold), createHold);

router.get('/', getMyHolds);

router.get('/:holdId', validate(holdSchema.getHoldById), getHoldById);

router.delete('/:holdId', validate(holdSchema.releaseHold), releaseHold);

module.exports = router;
