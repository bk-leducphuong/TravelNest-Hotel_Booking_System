const ApiError = require('@utils/ApiError');

/**
 * CLI argument builders for internal maintenance scripts. Pure functions: given
 * the request body they return the argv fragment, or throw an ApiError for an
 * invalid option.
 */

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

function buildDatabaseSeedArgs(seederName, body = {}) {
  const args = [];

  booleanFlag(args, body.clear === true || body.clearExisting === true, '--clear');

  if (seederName === 'images') {
    return buildImageSeedArgs(body);
  }

  if (seederName === 'city_images') {
    return buildCityImageSeedArgs(body);
  }

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

function buildImageSeedArgs(body = {}) {
  const args = [];

  if (body.hotelsOnly === true && body.roomsOnly === true) {
    throw new ApiError(
      400,
      'INVALID_INTERNAL_TASK_OPTION',
      'hotelsOnly and roomsOnly cannot both be true'
    );
  }

  booleanFlag(args, body.skipChecks === true || body.skipPrerequisites === true, '--skip-checks');
  booleanFlag(args, body.hotelsOnly === true, '--hotels-only');
  booleanFlag(args, body.roomsOnly === true, '--rooms-only');
  positiveIntegerArg(args, body.limit, '--limit');

  return args;
}

function buildImageSeedEnv(body = {}) {
  const env = {};

  if (body.apiBaseUrl) {
    if (typeof body.apiBaseUrl !== 'string') {
      throw new ApiError(400, 'INVALID_INTERNAL_TASK_OPTION', 'apiBaseUrl must be a string');
    }
    env.API_BASE_URL = body.apiBaseUrl;
  }

  if (body.healthCheckUrl) {
    if (typeof body.healthCheckUrl !== 'string') {
      throw new ApiError(400, 'INVALID_INTERNAL_TASK_OPTION', 'healthCheckUrl must be a string');
    }
    env.HEALTH_CHECK_URL = body.healthCheckUrl;
  }

  return env;
}

function buildCityImageSeedArgs(body = {}) {
  const args = [];

  if (body.primaryOnly === true && body.allImages === true) {
    throw new ApiError(
      400,
      'INVALID_INTERNAL_TASK_OPTION',
      'primaryOnly and allImages cannot both be true'
    );
  }

  booleanFlag(args, body.allImages === true || body.primaryOnly === false, '--all-images');
  positiveIntegerArg(args, body.limit, '--limit');

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

module.exports = {
  assertKnownTask,
  booleanFlag,
  positiveIntegerArg,
  stringArg,
  listArg,
  buildDatabaseSeedArgs,
  buildImageSeedArgs,
  buildImageSeedEnv,
  buildCityImageSeedArgs,
  buildElasticsearchSetupArgs,
  buildElasticsearchSeedArgs,
  buildMongodbSeedArgs,
};
