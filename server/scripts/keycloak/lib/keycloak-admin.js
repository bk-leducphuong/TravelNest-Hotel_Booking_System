const axios = require('axios');

function buildAxiosErrorMessage(error) {
  const status = error.response?.status;
  const detail =
    error.response?.data?.error_description ||
    error.response?.data?.errorMessage ||
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message;

  return status ? `HTTP ${status}: ${detail}` : detail;
}

function isCredentialImportError(error) {
  const status = error.response?.status;
  const haystack = JSON.stringify(error.response?.data || error.message || '').toLowerCase();

  if (![400, 422, 500].includes(status)) {
    return false;
  }

  return ['credential', 'password', 'bcrypt', 'hash', 'secretdata', 'credentialdata'].some(
    (token) => haystack.includes(token)
  );
}

class KeycloakAdminClient {
  constructor(config) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ''),
      timeout: 30000,
    });
    this.accessToken = null;
  }

  async authenticate() {
    const form = new URLSearchParams();

    if (this.config.adminClientSecret) {
      form.set('grant_type', 'client_credentials');
      form.set('client_id', this.config.adminClientId);
      form.set('client_secret', this.config.adminClientSecret);
    } else if (this.config.adminUsername && this.config.adminPassword) {
      form.set('grant_type', 'password');
      form.set('client_id', this.config.adminClientId);
      form.set('username', this.config.adminUsername);
      form.set('password', this.config.adminPassword);
    } else {
      throw new Error(
        'Missing Keycloak admin credentials. Set KEYCLOAK_ADMIN_CLIENT_SECRET or admin username/password.'
      );
    }

    try {
      const response = await this.http.post(
        `/realms/${encodeURIComponent(this.config.adminRealm)}/protocol/openid-connect/token`,
        form.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to authenticate to Keycloak: ${buildAxiosErrorMessage(error)}`);
    }
  }

  async request(config) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      return await this.http.request({
        ...config,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(config.headers || {}),
        },
      });
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return await this.http.request({
          ...config,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            ...(config.headers || {}),
          },
        });
      }

      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const response = await this.request({
        method: 'get',
        url: `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(userId)}`,
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }

      throw new Error(`Failed to fetch Keycloak user ${userId}: ${buildAxiosErrorMessage(error)}`);
    }
  }

  async findUsersByEmail(email) {
    try {
      const response = await this.request({
        method: 'get',
        url: `/admin/realms/${encodeURIComponent(this.config.realm)}/users`,
        params: {
          email,
          exact: true,
          max: 20,
        },
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      throw new Error(`Failed to search Keycloak user ${email}: ${buildAxiosErrorMessage(error)}`);
    }
  }

  async createUser(payload) {
    const response = await this.request({
      method: 'post',
      url: `/admin/realms/${encodeURIComponent(this.config.realm)}/users`,
      data: payload,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const locationHeader = response.headers.location || response.headers.Location;
    const userId = locationHeader?.split('/').pop();

    if (!userId) {
      const matches = await this.findUsersByEmail(payload.email);
      const matchedUser = matches.find((item) => item.email?.toLowerCase() === payload.email);
      if (!matchedUser) {
        throw new Error('Keycloak create user succeeded but no user identifier could be resolved');
      }
      return matchedUser;
    }

    const createdUser = await this.getUserById(userId);
    if (!createdUser) {
      throw new Error(`Keycloak created user ${userId} but it could not be fetched`);
    }

    return createdUser;
  }

  async createUserWithPasswordFallback({ userPayload, fallbackPayload }) {
    try {
      return {
        user: await this.createUser(userPayload),
        passwordResetRequired: false,
      };
    } catch (error) {
      if (!isCredentialImportError(error)) {
        throw new Error(
          `Failed to create Keycloak user ${userPayload.email}: ${buildAxiosErrorMessage(error)}`
        );
      }

      const fallbackUser = await this.createUser(fallbackPayload);
      return {
        user: fallbackUser,
        passwordResetRequired: true,
      };
    }
  }

  async getRealmRole(roleName) {
    try {
      const response = await this.request({
        method: 'get',
        url: `/admin/realms/${encodeURIComponent(this.config.realm)}/roles/${encodeURIComponent(roleName)}`,
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }

      throw new Error(
        `Failed to fetch Keycloak role ${roleName}: ${buildAxiosErrorMessage(error)}`
      );
    }
  }

  async getUserRealmRoleNames(userId) {
    try {
      const response = await this.request({
        method: 'get',
        url: `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      });

      return (response.data || []).map((role) => role.name);
    } catch (error) {
      throw new Error(
        `Failed to fetch Keycloak role mappings for user ${userId}: ${buildAxiosErrorMessage(error)}`
      );
    }
  }

  async addRealmRolesToUser(userId, roles) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return;
    }

    try {
      await this.request({
        method: 'post',
        url: `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
        data: roles,
      });
    } catch (error) {
      throw new Error(
        `Failed to assign Keycloak roles for user ${userId}: ${buildAxiosErrorMessage(error)}`
      );
    }
  }
}

module.exports = {
  KeycloakAdminClient,
  buildAxiosErrorMessage,
};
