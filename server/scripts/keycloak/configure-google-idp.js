#!/usr/bin/env node
/* eslint-disable no-console */

// Configure (or update) the Google identity provider on an already-running
// Keycloak realm.
//
// Keycloak only imports a realm from realm JSON when the realm does not yet
// exist, so the `identityProviders` stanza in travelnest-realm.json is applied
// only to a fresh realm. Use this script to reconcile an existing realm — e.g.
// a local Keycloak volume that predates the Google IdP.
//
// Usage:
//   node scripts/keycloak/configure-google-idp.js --dry-run
//   node scripts/keycloak/configure-google-idp.js
//
// Requires the KEYCLOAK_* admin vars (see lib/runtime.js) plus:
//   GOOGLE_CLIENT_ID       OAuth 2.0 client ID from Google Cloud Console
//   GOOGLE_CLIENT_SECRET   OAuth 2.0 client secret from Google Cloud Console
//
// The Google client must allow this redirect URI:
//   ${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/broker/google/endpoint

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

require('../../register-aliases');

const { createAdminClient, buildKeycloakConfig } = require('./lib/runtime');

const ALIAS = 'google';

function readArgs(argv) {
  const args = { dryRun: false };

  for (const token of argv) {
    if (token === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function buildIdentityProviderFromEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const missing = Object.entries({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret })
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  return {
    alias: ALIAS,
    displayName: 'Google',
    providerId: 'google',
    enabled: true,
    // The API rejects tokens without `email_verified: true`. Google verifies
    // addresses before issuing them, so trusting the IdP is safe here.
    trustEmail: true,
    storeToken: false,
    linkOnly: false,
    firstBrokerLoginFlowAlias: 'first broker login',
    config: {
      clientId,
      clientSecret,
      defaultScope: 'openid email profile',
      syncMode: 'IMPORT',
      useJwksUrl: 'true',
      // Keycloak only skips signature validation when `validateSignature` is
      // false; with validation on it must have a JWKS URL to fetch Google's
      // signing keys from, otherwise the callback fails with
      // "token signature validation failed".
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      validateSignature: 'true',
    },
  };
}

function redirectUri(config) {
  const base = config.baseUrl.replace(/\/$/, '');
  return `${base}/realms/${encodeURIComponent(config.realm)}/broker/${ALIAS}/endpoint`;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const config = buildKeycloakConfig();
  const admin = createAdminClient();
  const realmUrl = `/admin/realms/${encodeURIComponent(config.realm)}`;
  const instanceUrl = `${realmUrl}/identity-provider/instances/${ALIAS}`;

  const identityProvider = buildIdentityProviderFromEnv();

  let existing = null;
  try {
    const response = await admin.request({ method: 'get', url: instanceUrl });
    existing = response.data;
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }
  }

  console.log(`Realm:            ${config.realm}`);
  console.log(`Base URL:         ${config.baseUrl}`);
  console.log(`Google redirect:  ${redirectUri(config)}`);
  console.log(`Identity provider: ${existing ? 'update existing' : 'create'}`);
  console.log(
    JSON.stringify(
      {
        ...identityProvider,
        config: {
          ...identityProvider.config,
          clientSecret: '<redacted>',
        },
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    console.log('\n[dry-run] No changes written.');
    return;
  }

  // Keycloak's update endpoint expects the complete representation. Preserve
  // server-assigned fields (internalId) and any config keys we do not manage.
  const payload = {
    ...(existing || {}),
    ...identityProvider,
    config: {
      ...(existing?.config || {}),
      ...identityProvider.config,
    },
  };

  if (existing) {
    await admin.request({
      method: 'put',
      url: instanceUrl,
      data: payload,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    console.log('\n✔ Google identity provider updated.');
  } else {
    await admin.request({
      method: 'post',
      url: `${realmUrl}/identity-provider/instances`,
      data: payload,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    console.log('\n✔ Google identity provider created.');
  }

  console.log(
    'Sign in through the guest/admin app and verify the user under Keycloak → Users → Identity provider links.'
  );
}

main().catch((error) => {
  console.error(error.response?.data?.errorMessage || error.stack || error.message);
  process.exit(1);
});
