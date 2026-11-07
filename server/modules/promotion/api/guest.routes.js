const express = require('express');

const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');

const schema = require('./promotion.schema');
const { previewPromotionHandler } = require('./guest.controller');

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/v1/promotions/preview
 * Authenticated `{ holdId, code? }`. Returns the best automatic/code quote for
 * the hold without consuming any usage. Omitting `code` returns the automatic
 * offer, which is how the client removes a submitted code.
 */
router.post('/preview', validate(schema.preview), previewPromotionHandler);

module.exports = router;
