const path = require('path');
const { spawn } = require('child_process');

const ApiError = require('@utils/ApiError');

const SERVER_ROOT = path.resolve(__dirname, '..');
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_OUTPUT_CHARS = 20000;

const runningTasks = new Map();

const DATABASE_SEEDERS = {
  all: 'seeders/database/seed-all.js',
  user: 'seeders/database/user.seed.js',
  amenity: 'seeders/database/amenity.seed.js',
  hotel: 'seeders/database/hotel.seed.js',
  hotel_amenity: 'seeders/database/hotel_amenity.seed.js',
  room_inventory: 'seeders/database/room_inventory.seed.js',
  room_amenity: 'seeders/database/room_amenity.seed.js',
  permission: 'seeders/database/permission.seed.js',
  hotel_search_snapshot: 'seeders/database/hotel_search_snapshot.seed.js',
  images: 'seeders/database/images.seed.js',
  review: 'seeders/database/review.seed.js',
  room: 'seeders/database/room.seed.js',
  booking: 'seeders/database/booking.seed.js',
  policy: 'seeders/database/hotel_policy.seed.js',
  cancellation_rule: 'seeders/database/hotel_cancellation_rule.seed.js',
  nearby_place: 'seeders/database/nearby_place.seed.js',
  notification: 'seeders/database/notification.seed.js',
  city: 'seeders/database/city.seed.js',
  city_images: 'seeders/database/city_images.seed.js',
  country: 'seeders/database/country.seed.js',
  destination: 'seeders/database/destinations.seed.js',
};

const ELASTICSEARCH_SETUP = {
  hotels: 'infra/elasticsearch/setup-hotels-index.js',
  logs: 'infra/elasticsearch/setup-logs-index.js',
  destinations: 'infra/elasticsearch/setup-destinations-index.js',
};

const ELASTICSEARCH_SEEDERS = {
  hotels: 'seeders/elasticsearch/hotels_index.seed.js',
  destinations: 'seeders/elasticsearch/destinations_index.seed.js',
};

const MONGODB_SEEDERS = {
  search_logs: 'seeders/mongodb/search_logs.seed.js',
  hotel_views: 'seeders/mongodb/hotel_view_events.seed.js',
};

function assertKnownTask(map, name, taskType) {
  const script = map[name];

  if (!script) {
    throw new ApiError(404, 'UNKNOWN_INTERNAL_TASK', `Unknown ${taskType}: ${name}`, {
      allowedValues: Object.keys(map),
    });
  }

  return script;
}

function booleanFlag(args, value, flag) {
  if (value === true) {
    args.push(flag);
  }
}

function positiveIntegerArg(args, value, flag) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, 'INVALID_INTERNAL_TASK_OPTION', `${flag} must be a positive integer`);
  }

  args.push(`${flag}=${parsed}`);
}

function stringArg(args, value, flag) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_INTERNAL_TASK_OPTION', `${flag} must be a string`);
  }

  args.push(`${flag}=${value}`);
}

function listArg(args, value, flag) {
  if (!value) {
    return;
  }

  const values = Array.isArray(value) ? value : String(value).split(',');
  const cleanedValues = values.map((item) => String(item).trim()).filter(Boolean);

  if (cleanedValues.length > 0) {
    args.push(`${flag}=${cleanedValues.join(',')}`);
  }
}

function trimOutput(value) {
  if (!value || value.length <= MAX_OUTPUT_CHARS) {
    return value;
  }

  return value.slice(value.length - MAX_OUTPUT_CHARS);
}

function runScript(taskKey, scriptPath, args = [], options = {}) {
  if (runningTasks.has(taskKey)) {
    throw new ApiError(409, 'INTERNAL_TASK_RUNNING', `Task is already running: ${taskKey}`);
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const startedAt = new Date();
  const childArgs = [scriptPath, ...args];

  const taskPromise = new Promise((resolve, reject) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: SERVER_ROOT,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new ApiError(504, 'INTERNAL_TASK_TIMEOUT', `Task timed out after ${timeoutMs}ms`, {
          task: taskKey,
        })
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = trimOutput(stdout + chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderr = trimOutput(stderr + chunk.toString());
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(
        new ApiError(500, 'INTERNAL_TASK_SPAWN_FAILED', `Failed to start task: ${taskKey}`, {
          message: error.message,
        })
      );
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);

      const finishedAt = new Date();
      const result = {
        task: taskKey,
        script: scriptPath,
        args,
        exitCode: code,
        signal,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdout,
        stderr,
      };

      if (code !== 0) {
        reject(
          new ApiError(500, 'INTERNAL_TASK_FAILED', `Task failed: ${taskKey}`, {
            ...result,
          })
        );
        return;
      }

      resolve(result);
    });
  });

  runningTasks.set(taskKey, taskPromise);

  return taskPromise.finally(() => {
    runningTasks.delete(taskKey);
  });
}

function buildDatabaseSeedArgs(seederName, body = {}) {
  const args = [];

  booleanFlag(args, body.clear === true || body.clearExisting === true, '--clear');

  if (seederName === 'all') {
    booleanFlag(args, body.quick === true, '--quick');
    booleanFlag(args, body.skipImages === true, '--skip-images');
    booleanFlag(args, body.skipSnapshots === true, '--skip-snapshots');
  }

  if (seederName === 'hotel_search_snapshot') {
    booleanFlag(args, body.rebuild === true, '--rebuild');
  }

  return args;
}

function buildElasticsearchSetupArgs(target, body = {}) {
  const args = [];

  booleanFlag(args, body.force === true, '--force');

  if (target === 'logs') {
    booleanFlag(args, body.createIndex === true, '--create-index');
  }

  return args;
}

function buildElasticsearchSeedArgs(target, body = {}) {
  const args = [];

  booleanFlag(args, body.clear === true || body.clearExisting === true, '--clear');
  positiveIntegerArg(args, body.batchSize, '--batch-size');

  if (target === 'hotels') {
    listArg(args, body.hotelIds, '--hotel-ids');
    stringArg(args, body.status, '--status');
  }

  return args;
}

function buildMongodbSeedArgs(target, body = {}) {
  const args = [];

  booleanFlag(args, body.clear === true || body.clearExisting === true, '--clear');
  positiveIntegerArg(args, body.days, '--days');
  positiveIntegerArg(args, body.batch, '--batch');

  if (target === 'search_logs') {
    positiveIntegerArg(args, body.rows, '--rows');
  }

  if (target === 'hotel_views') {
    positiveIntegerArg(args, body.avgPerHotel, '--avg-per-hotel');
  }

  return args;
}

async function initDatabase(body = {}) {
  const args = [];

  return runScript('database:init', 'infra/database/init.js', args, {
    timeoutMs: body.timeoutMs,
  });
}

async function runDatabaseSeeder(seederName, body = {}) {
  const script = assertKnownTask(DATABASE_SEEDERS, seederName, 'database seeder');
  const args = buildDatabaseSeedArgs(seederName, body);

  return runScript(`database:seed:${seederName}`, script, args, {
    timeoutMs: body.timeoutMs,
  });
}

async function setupElasticsearch(target, body = {}) {
  const script = assertKnownTask(ELASTICSEARCH_SETUP, target, 'Elasticsearch setup task');
  const args = buildElasticsearchSetupArgs(target, body);

  return runScript(`elasticsearch:setup:${target}`, script, args, {
    timeoutMs: body.timeoutMs,
  });
}

async function runElasticsearchSeeder(target, body = {}) {
  const script = assertKnownTask(ELASTICSEARCH_SEEDERS, target, 'Elasticsearch seeder');
  const args = buildElasticsearchSeedArgs(target, body);

  return runScript(`elasticsearch:seed:${target}`, script, args, {
    timeoutMs: body.timeoutMs,
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
    elasticsearchSetup: Object.keys(ELASTICSEARCH_SETUP),
    elasticsearchSeeders: Object.keys(ELASTICSEARCH_SEEDERS),
    mongodbSeeders: Object.keys(MONGODB_SEEDERS),
    runningTasks: Array.from(runningTasks.keys()),
  };
}

module.exports = {
  initDatabase,
  runDatabaseSeeder,
  setupElasticsearch,
  runElasticsearchSeeder,
  runMongodbSeeder,
  listTasks,
};
