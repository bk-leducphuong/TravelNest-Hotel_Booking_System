const ApiError = require('@utils/ApiError');
const { buildPartnerUrl, PartnerTemplateError } = require('../domain/partnerLink');

/**
 * Outbound partner services. Adding a service is a config-only change: add an
 * entry here, the matching `PARTNER_<SERVICE>_URL_TEMPLATE` variable and a
 * client route. No partner id or URL shape is ever shipped to the browser.
 */
const SERVICES = {
  flights: {
    templateEnv: 'PARTNER_FLIGHTS_URL_TEMPLATE',
    nameEnv: 'PARTNER_FLIGHTS_NAME',
  },
  transfers: {
    templateEnv: 'PARTNER_TRANSFERS_URL_TEMPLATE',
    nameEnv: 'PARTNER_TRANSFERS_NAME',
  },
};

const SUPPORTED_SERVICES = Object.keys(SERVICES);

function getPartnerLink({ service, params = {} }) {
  const definition = SERVICES[service];

  if (!definition) {
    throw new ApiError(400, 'UNKNOWN_PARTNER_SERVICE', `Unknown partner service: ${service}`);
  }

  const template = process.env[definition.templateEnv];

  if (!template) {
    throw new ApiError(503, 'PARTNER_NOT_CONFIGURED', 'This partner service is not configured yet');
  }

  let url;
  try {
    url = buildPartnerUrl({ template, params, campaign: service });
  } catch (error) {
    if (error instanceof PartnerTemplateError) {
      throw new ApiError(503, 'PARTNER_MISCONFIGURED', 'Partner service is misconfigured');
    }
    throw error;
  }

  return {
    service,
    provider: process.env[definition.nameEnv] || null,
    url,
  };
}

module.exports = { getPartnerLink, SERVICES, SUPPORTED_SERVICES };
