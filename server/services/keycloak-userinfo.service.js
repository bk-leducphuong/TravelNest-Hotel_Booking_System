const axios = require('axios');

function getUserInfoEndpoint() {
  const issuer = process.env.KEYCLOAK_ISSUER;

  if (!issuer) {
    throw new Error('KEYCLOAK_ISSUER is required to resolve Keycloak userinfo');
  }

  return `${issuer.replace(/\/$/, '')}/protocol/openid-connect/userinfo`;
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
