/**
 * Run pending Sequelize migrations.
 *
 * Thin wrapper around `sequelize-cli db:migrate` so migrations can be invoked as
 * a plain node script (e.g. by the internal superadmin task runner), consistent
 * with how the other maintenance scripts are executed.
 */
const path = require('path');

const { spawnSync } = require('child_process');

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const SEQUELIZE_BIN = require.resolve('sequelize-cli/lib/sequelize');

const result = spawnSync(process.execPath, [SEQUELIZE_BIN, 'db:migrate'], {
  cwd: SERVER_ROOT,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
