#!/usr/bin/env node
/* eslint-disable no-console */

// Configure the realm-level SMTP server Keycloak uses for verification /
// password-reset emails, and (optionally) test the connection.
//
// Keycloak only imports a realm from realm JSON when the realm does not yet
// exist, so this Admin REST call is the way to (re)apply SMTP settings to an
// already-running realm — e.g. the production `travelnest` realm.
//
// Usage:
//   node scripts/keycloak/configure-smtp.js --dry-run
//   node scripts/keycloak/configure-smtp.js --test-only
//   node scripts/keycloak/configure-smtp.js
//
// Requires the KEYCLOAK_* admin vars (see lib/runtime.js) plus:
//   KEYCLOAK_SMTP_HOST       e.g. smtp.gmail.com
//   KEYCLOAK_SMTP_PORT       e.g. 587
//   KEYCLOAK_SMTP_USER       e.g. no-reply@example.com
//   KEYCLOAK_SMTP_PASSWORD   Gmail App Password (16 chars)
//   KEYCLOAK_SMTP_FROM       defaults to KEYCLOAK_SMTP_USER
//   KEYCLOAK_SMTP_ENCRYPTION "starttls" (default) or "ssl"

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

require('../../register-aliases');

const { createAdminClient, buildKeycloakConfig } = require('./lib/runtime');

function readArgs(argv) {
  const args = { dryRun: false, testOnly: false };

  for (const token of argv) {
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token === '--test-only') {
      args.testOnly = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function buildSmtpServerFromEnv() {
  const host = process.env.KEYCLOAK_SMTP_HOST;
  const port = process.env.KEYCLOAK_SMTP_PORT || '587';
  const user = process.env.KEYCLOAK_SMTP_USER;
  const password = process.env.KEYCLOAK_SMTP_PASSWORD;
  const from = process.env.KEYCLOAK_SMTP_FROM || user;
  const fromDisplayName = process.env.KEYCLOAK_SMTP_FROM_NAME || 'TravelNest';
  const encryption = (process.env.KEYCLOAK_SMTP_ENCRYPTION || 'starttls').toLowerCase();

  const missing = Object.entries({ host, user, password })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Missing SMTP env vars: ${missing.map((k) => `KEYCLOAK_SMTP_${k}`).join(', ')}`
    );
  }

  if (!['starttls', 'ssl'].includes(encryption)) {
    throw new Error('KEYCLOAK_SMTP_ENCRYPTION must be "starttls" or "ssl"');
  }

  // Keycloak's RealmRepresentation.smtpServer is a map of string values.
  return {
    host,
    port: String(port),
    from,
    fromDisplayName,
    replyTo: process.env.KEYCLOAK_SMTP_REPLY_TO || from,
    replyToDisplayName: fromDisplayName,
    envelopeFrom: process.env.KEYCLOAK_SMTP_ENVELOPE_FROM || from,
    auth: 'true',
    user,
    password,
    ssl: encryption === 'ssl' ? 'true' : 'false',
    starttls: encryption === 'starttls' ? 'true' : 'false',
  };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const config = buildKeycloakConfig();
  const admin = createAdminClient();
  const realmUrl = `/admin/realms/${encodeURIComponent(config.realm)}`;

  const current = await admin.request({ method: 'get', url: realmUrl });

  console.log(`Realm:            ${config.realm}`);
  console.log(`Base URL:         ${config.baseUrl}`);
  console.log(`verifyEmail:      ${current.data.verifyEmail}`);
  console.log(`Current SMTP host: ${current.data.smtpServer?.host || '(none configured)'}`);

  const smtpServer = buildSmtpServerFromEnv();
  console.log('Target SMTP:');
  console.log(
    JSON.stringify({ ...smtpServer, password: '<redacted>', user: '<set>', auth: true }, null, 2)
  );

  if (args.dryRun) {
    console.log('\n[dry-run] No changes written.');
    return;
  }

  if (!args.testOnly) {
    await admin.request({
      method: 'put',
      url: realmUrl,
      data: { ...current.data, smtpServer },
      validateStatus: (status) => status >= 200 && status < 300,
    });
    console.log('\n✔ Realm SMTP settings updated.');
  }

  try {
    await admin.request({
      method: 'post',
      url: `${realmUrl}/testSMTPConnection`,
      data: smtpServer,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    console.log('✔ testSMTPConnection succeeded — Keycloak sent a test email to the admin user.');
  } catch (error) {
    console.error(
      '✖ testSMTPConnection failed:',
      error.response?.data?.errorMessage || error.message
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
