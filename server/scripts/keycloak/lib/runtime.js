require('../../../register-aliases');

const { parseArgs } = require('./args');
const { KeycloakAdminClient } = require('./keycloak-admin');
const { readLatestReport, readReport, writeReport } = require('./reporting');
const { closeSource, fetchSourceUsers } = require('./source-users');

function buildKeycloakConfig() {
  const config = {
    baseUrl: process.env.KEYCLOAK_BASE_URL,
    realm: process.env.KEYCLOAK_REALM,
    adminRealm: process.env.KEYCLOAK_ADMIN_REALM || 'master',
    adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
    adminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || null,
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME || null,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || null,
  };

  const missing = ['baseUrl', 'realm', 'adminClientId'].filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required Keycloak env vars: ${missing.join(', ')}`);
  }

  return config;
}

function buildBatchId(args) {
  return args.batchId || new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveResumeUserIds(batchId) {
  const report = batchId ? readReport('migrate-users', batchId) : readLatestReport('migrate-users');

  if (!report) {
    return new Set();
  }

  return new Set(
    (report.data.results || [])
      .filter((item) => ['created', 'bound_existing', 'skipped'].includes(item.status))
      .map((item) => item.userId)
  );
}

async function loadUsers(args, commandName) {
  const users = await fetchSourceUsers({
    email: args.email,
    limit: args.limit,
  });

  const resumedUserIds = args.resume ? resolveResumeUserIds(args.batchId) : new Set();
  const filteredUsers = users.filter((user) => !resumedUserIds.has(user.id));

  return {
    batchId: buildBatchId(args),
    args,
    commandName,
    users: filteredUsers,
  };
}

function createAdminClient() {
  return new KeycloakAdminClient(buildKeycloakConfig());
}

async function finalize(commandName, batchId, payload, exitCode = 0) {
  const reportPath = writeReport(commandName, batchId, payload);
  await closeSource();
  return {
    exitCode,
    reportPath,
  };
}

module.exports = {
  buildBatchId,
  buildKeycloakConfig,
  createAdminClient,
  finalize,
  loadUsers,
  parseArgs,
};
