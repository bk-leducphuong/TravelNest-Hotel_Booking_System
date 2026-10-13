const axios = require('axios');

function getUserInfoEndpoint() {
  if (process.env.KEYCLOAK_USERINFO_URL) {
    return process.env.KEYCLOAK_USERINFO_URL;
  }

  // Prefer an in-cluster base URL: the public issuer sits behind Cloudflare,
  // which challenges server-to-server requests from the VPS egress.
  const base = process.env.KEYCLOAK_INTERNAL_URL || process.env.KEYCLOAK_ISSUER;

  if (!base) {
    throw new Error('KEYCLOAK_ISSUER is required to resolve Keycloak userinfo');
  }

  return `${base.replace(/\/$/, '')}/protocol/openid-connect/userinfo`;
}

class KeycloakUserInfoService {
  async getUserInfo(accessToken) {
    const response = await axios.get(getUserInfoEndpoint(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 5000,
    });

    return response.data || {};
  }
}

module.exports = new KeycloakUserInfoService();
