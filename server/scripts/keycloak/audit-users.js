#!/usr/bin/env node
/* eslint-disable no-console */

require('../../register-aliases');

const { auditUsers } = require('./lib/migration-core');
const { createAdminClient, finalize, loadUsers, parseArgs } = require('./lib/runtime');

async function main() {
  const args = parseArgs();
  const { batchId, users } = await loadUsers(args, 'audit-users');
  const adminClient = createAdminClient();
  const audit = await auditUsers(users, adminClient);

  const payload = {
    command: 'audit-users',
    batchId,
    dryRun: args.dryRun,
    filters: {
      email: args.email,
      limit: args.limit,
      resume: args.resume,
    },
    summary: {
      ok: audit.ok,
      scanned: users.length,
      failures: audit.failures.length,
      infos: audit.infos.length,
    },
    failures: audit.failures,
    infos: audit.infos,
  };

  const { reportPath, exitCode } = await finalize(
    'audit-users',
    batchId,
    payload,
    audit.ok ? 0 : 1
  );

  console.log(
    JSON.stringify(
      {
        ok: audit.ok,
        scanned: users.length,
        failures: audit.failures.length,
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
