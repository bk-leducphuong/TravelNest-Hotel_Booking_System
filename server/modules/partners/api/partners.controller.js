const asyncHandler = require('@utils/asyncHandler');

const { getPartnerLink } = require('../application/getPartnerLink');

const getPartnerLinkHandler = asyncHandler(async (req, res) => {
  const { service, ...params } = req.query;

  const data = getPartnerLink({ service, params });

  res.status(200).json({ success: true, data });
});

module.exports = { getPartnerLinkHandler };
