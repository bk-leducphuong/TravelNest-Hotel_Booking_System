const { DATABASE_SEEDERS, MONGODB_SEEDERS } = require('./registries');
const {
  assertKnownTask,
  buildDatabaseSeedArgs,
  buildImageSeedArgs,
  buildImageSeedEnv,
  buildCityImageSeedArgs,
  buildMongodbSeedArgs,
} = require('./args');
const { runScript, runningTasks } = require('./runner');

/**
 * Internal maintenance tooling (superadmin API).
 *
 * Migrations and database/MongoDB seeders, run as child processes so
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

async function runMongodbSeeder(target, body = {}) {
  const script = assertKnownTask(MONGODB_SEEDERS, target, 'MongoDB seeder');
  const args = buildMongodbSeedArgs(target, body);

  return runScript(`mongodb:seed:${target}`, script, args, {
    timeoutMs: body.timeoutMs,
  });
}

function listTasks() {
  return {
    databaseSeeders: Object.keys(DATABASE_SEEDERS),
    mongodbSeeders: Object.keys(MONGODB_SEEDERS),
    runningTasks: Array.from(runningTasks.keys()),
  };
}

module.exports = {
  initDatabase,
  runDatabaseSeeder,
  runImageSeeder,
  runCityImageSeeder,
  runMongodbSeeder,
  listTasks,
};
