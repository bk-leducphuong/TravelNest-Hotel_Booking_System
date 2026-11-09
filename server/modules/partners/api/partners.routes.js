const express = require('express');

const validate = require('@middlewares/validate.middleware');

const schema = require('./partners.schema');
const { getPartnerLinkHandler } = require('./partners.controller');

const router = express.Router();

/**
 * GET /api/v1/partners/links?service=flights|transfers&...
 *
 * Public. Returns the outbound affiliate deep link for a partner service so the
 * browser never holds the affiliate id or the partner's URL template.
 */
router.get('/links', validate(schema.getPartnerLink), getPartnerLinkHandler);

module.exports = router;
