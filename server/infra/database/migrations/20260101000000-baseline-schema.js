'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Baseline schema.
 *
 * Applies `infra/database/schema/baseline.sql` - the canonical, generated snapshot
 * of the database DDL. This migration is ordered before every other migration so a
 * fresh database is built entirely from versioned migrations instead of
 * `sequelize.sync()`.
 *
 * It is idempotent (`CREATE TABLE IF NOT EXISTS`), so it is a no-op on databases
 * whose tables were previously created by `sequelize.sync()`.
 */

const SQL_PATH = path.resolve(__dirname, '..', 'schema', 'baseline.sql');
const STATEMENT_SEPARATOR = /^\s*--\s*@@schema-statement@@\s*$/m;

function loadStatements() {
  const raw = fs.readFileSync(SQL_PATH, 'utf8');

  return raw
    .split(STATEMENT_SEPARATOR)
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

function tableNames() {
  return loadStatements()
    .map((statement) => {
      const match = statement.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/i);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

/**
 * Run a set of statements on a single pinned connection so session state
 * (`FOREIGN_KEY_CHECKS`) applies to every statement. The statements are ordered
 * alphabetically, which does not respect foreign-key dependencies, so FK checks
 * must stay disabled for the whole batch.
 */
async function runOnPinnedConnection(sequelize, statements) {
  const rawConnection = await sequelize.connectionManager.getConnection();
  // Sequelize v6 hands back the raw (callback-style) mysql2 connection. Wrap it so
  // we can await, while still releasing the original object to the pool.
  const connection =
    typeof rawConnection.promise === 'function' ? rawConnection.promise() : rawConnection;

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  } finally {
    await sequelize.connectionManager.releaseConnection(rawConnection);
  }
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await runOnPinnedConnection(sequelize, loadStatements());
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const drops = tableNames()
      .reverse()
      .map((table) => `DROP TABLE IF EXISTS \`${table}\``);
    await runOnPinnedConnection(sequelize, drops);
  },
};
