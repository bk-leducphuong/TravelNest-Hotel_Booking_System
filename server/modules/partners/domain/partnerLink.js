/**
 * Build the outbound affiliate URL for a partner service.
 *
 * The URL template comes from configuration because each affiliate programme
 * issues its own shape. `{placeholder}` tokens are replaced with URL-encoded
 * request values; placeholders the guest left blank are dropped so optional
 * fields (a return flight, for example) do not leave `//` or empty query
 * parameters behind.
 */

const PLACEHOLDER = /\{(\w+)\}/g;
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const DEFAULT_TRACKING = {
  utm_source: 'travelnest',
  utm_medium: 'affiliate',
};

class PartnerTemplateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PartnerTemplateError';
    this.code = 'INVALID_PARTNER_TEMPLATE';
  }
}

function valueFor(params, key) {
  const value = params[key];

  if (value === undefined || value === null || value === '') {
    return '';
  }

  return encodeURIComponent(String(value));
}

function buildPartnerUrl({ template, params = {}, campaign = null, tracking = {} }) {
  if (typeof template !== 'string' || !template.trim()) {
    throw new PartnerTemplateError('Partner URL template is empty');
  }

  // Collapse empty path segments left by dropped placeholders. The `[^:]`
  // guard keeps the `//` in `https://`.
  const filled = template
    .replace(PLACEHOLDER, (_, key) => valueFor(params, key))
    .replace(/([^:])\/{2,}/g, '$1/');

  let url;
  try {
    url = new URL(filled);
  } catch {
    throw new PartnerTemplateError('Partner URL template is not a valid absolute URL');
  }

  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new PartnerTemplateError('Partner URL template must use http or https');
  }

  // Drop query parameters whose placeholder was left blank.
  for (const key of [...url.searchParams.keys()]) {
    if (url.searchParams.get(key) === '') {
      url.searchParams.delete(key);
    }
  }

  const mergedTracking = {
    ...DEFAULT_TRACKING,
    ...(campaign ? { utm_campaign: campaign } : {}),
    ...tracking,
  };

  for (const [key, value] of Object.entries(mergedTracking)) {
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

module.exports = { buildPartnerUrl, PartnerTemplateError };
