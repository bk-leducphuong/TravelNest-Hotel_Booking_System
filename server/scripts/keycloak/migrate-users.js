#!/usr/bin/env node
/* eslint-disable no-console */

require('../../register-aliases');

const db = require('../../models');

const { migrateSingleUser, summarizeResults } = require('./lib/migration-core');
const { createAdminClient, finalize, loadUsers, parseArgs } = require('./lib/runtime');

async function main() {
  const args = parseArgs();
  const { batchId, users } = await loadUsers(args, 'migrate-users');
  const adminClient = createAdminClient();
  const roleCache = new Map();
  const results = [];

  for (const sourceUser of users) {
    try {
      const result = await migrateSingleUser({
        sourceUser,
        adminClient,
        dryRun: args.dryRun,
        batchId,
        roleCache,
        bindKeycloakUserId: async (userId, keycloakUserId) => {
          await db.users.update({ keycloak_user_id: keycloakUserId }, { where: { id: userId } });
        },
      });

      results.push(result);
    } catch (error) {
      results.push({
        userId: sourceUser.id,
        email: sourceUser.normalized_email || sourceUser.email,
        status: 'failed',
        reason: error.message,
        passwordResetRequired: false,
      });
    }
  }

  const summary = summarizeResults(results);
  const payload = {
    command: 'migrate-users',
    batchId,
    dryRun: args.dryRun,
    filters: {
      email: args.email,
      limit: args.limit,
      resume: args.resume,
    },
    summary,
    results,
  };

  const hasFailures = summary.failed > 0;
  const { reportPath, exitCode } = await finalize(
    'migrate-users',
    batchId,
    payload,
    hasFailures ? 1 : 0
  );

  console.log(
    JSON.stringify(
      {
        ...summary,
        reportPath,
      },
      null,
      2
    )
  );

  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
