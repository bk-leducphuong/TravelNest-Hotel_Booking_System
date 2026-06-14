#!/usr/bin/env node
/* eslint-disable no-console */

require('../../register-aliases');

const { verifyUsers } = require('./lib/migration-core');
const { createAdminClient, finalize, loadUsers, parseArgs } = require('./lib/runtime');

async function main() {
  const args = parseArgs();
  const { batchId, users } = await loadUsers(args, 'verify-users');
  const adminClient = createAdminClient();
  const verification = await verifyUsers(users, adminClient);

  const payload = {
    command: 'verify-users',
    batchId,
    dryRun: args.dryRun,
    filters: {
      email: args.email,
      limit: args.limit,
      resume: args.resume,
    },
    summary: {
      ok: verification.ok,
      ...verification.counts,
      failures: verification.failures.length,
    },
    failures: verification.failures,
  };

  const { reportPath, exitCode } = await finalize(
    'verify-users',
    batchId,
    payload,
    verification.ok ? 0 : 1
  );

  console.log(
    JSON.stringify(
      {
        ok: verification.ok,
        ...verification.counts,
        failures: verification.failures.length,
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
