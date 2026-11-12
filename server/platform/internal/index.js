const { DATABASE_SEEDERS, ANALYTICS_SEEDERS } = require('./registries');
const {
  assertKnownTask,
  buildDatabaseSeedArgs,
  buildImageSeedArgs,
  buildImageSeedEnv,
  buildCityImageSeedArgs,
  buildAnalyticsSeedArgs,
} = require('./args');
const { runScript, runningTasks } = require('./runner');

/**
 * Internal maintenance tooling (superadmin API).
 *
 * Migrations and database/analytics seeders, run as child processes so
 * a long job can't take down the API process. Each task is guarded against
 * concurrent runs. Not a domain module - operational plumbing.
 */

async function initDatabase(body = {}) {
  // Runs migrations (the baseline migration creates the full schema).
  return runScript('database:init', 'infra/database/migrate.js', [], {
    timeoutMs: body.timeoutMs,
  });
}

async function runDatabaseSeeder(seederName, body = {}) {
  const script = assertKnownTask(DATABASE_SEEDERS, seederName, 'database seeder');
  const args = buildDatabaseSeedArgs(seederName, body);
  const imageSeederNames = new Set(['images', 'city_images']);

  return runScript(`database:seed:${seederName}`, script, args, {
    timeoutMs: body.timeoutMs,
    env: imageSeederNames.has(seederName) ? buildImageSeedEnv(body) : undefined,
  });
}

async function runImageSeeder(body = {}) {
  const args = buildImageSeedArgs(body);

  return runScript('database:seed:images', DATABASE_SEEDERS.images, args, {
    timeoutMs: body.timeoutMs,
    env: buildImageSeedEnv(body),
  });
}

async function runCityImageSeeder(body = {}) {
  const args = buildCityImageSeedArgs(body);

  return runScript('database:seed:city_images', DATABASE_SEEDERS.city_images, args, {
    timeoutMs: body.timeoutMs,
    env: buildImageSeedEnv(body),
  });
}

async function runAnalyticsSeeder(target, body = {}) {
  const script = assertKnownTask(ANALYTICS_SEEDERS, target, 'analytics seeder');
  const args = buildAnalyticsSeedArgs(target, body);

  return runScript(`analytics:seed:${target}`, script, args, {
    timeoutMs: body.timeoutMs,
  });
}

function listTasks() {
  return {
    databaseSeeders: Object.keys(DATABASE_SEEDERS),
    analyticsSeeders: Object.keys(ANALYTICS_SEEDERS),
    runningTasks: Array.from(runningTasks.keys()),
  };
}

module.exports = {
  initDatabase,
  runDatabaseSeeder,
  runImageSeeder,
  runCityImageSeeder,
  runAnalyticsSeeder,
  listTasks,
};
