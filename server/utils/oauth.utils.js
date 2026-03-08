function getCallbackUrl(provider) {
  const baseUrl = process.env.EXTERNAL_BASE_URL || '';
  if (!baseUrl) {
    // Relative path for dev/proxy setups
    return `/api/v1/auth/${provider}/callback`;
  }
  return `${baseUrl}/auth/${provider}/callback`;
}

module.exports = {
  getCallbackUrl,
};
