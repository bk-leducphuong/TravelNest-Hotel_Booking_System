/**
 * Parent-id manifests for the fast seed pipeline.
 *
 * A manifest is a newline-delimited file of UUIDs written to `.seed-tmp/`
 * (e.g. `hotels.ids`, `rooms.ids`). Child generators can then sample parent ids
 * without a per-row DB round-trip.
 *
 * Sampling keeps memory bounded: once the file exceeds `maxInMemory` ids the
 * sampler switches to reservoir sampling, trading exactness for a fixed memory
 * ceiling (child FK values only need to be *valid*, not exhaustively
 * proportional).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { once } = require('events');

const { TMP_DIR, ensureTmpDir } = require('./env');

function manifestPath(table) {
  return path.join(ensureTmpDir(), `${table}.ids`);
}

/**
 * Remove the scratch dir (stale manifests from a previous run whose parents may
 * no longer match the current data).
 */
function resetTmpDir() {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  return ensureTmpDir();
}

function manifestExists(table) {
  return fs.existsSync(manifestPath(table));
}

/**
 * Write every id from an iterable (sync or async) to `<table>.ids`.
 * @param {string} table
 * @param {Iterable<string>|AsyncIterable<string>} ids
 */
async function writeManifest(table, ids) {
  const filePath = manifestPath(table);
  const ws = fs.createWriteStream(filePath, { flags: 'w' });
  let count = 0;

  for await (const id of ids) {
    count += 1;
    if (!ws.write(`${id}\n`)) {
      await once(ws, 'drain');
    }
  }

  await new Promise((resolve, reject) => {
    ws.end((error) => (error ? reject(error) : resolve()));
  });

  return { filePath, count };
}

/**
 * Read up to `max` ids back into memory.
 * @param {string} table
 * @param {{ max?: number }} [options]
 * @returns {Promise<string[]>}
 */
async function readManifest(table, { max = Infinity } = {}) {
  const filePath = manifestPath(table);
  const ids = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const id = line.trim();
    if (id) {
      ids.push(id);
    }
    if (ids.length >= max) {
      rl.close();
      break;
    }
  }

  return ids;
}

/**
 * Build a random-access sampler over a manifest. Memory is capped at
 * `maxInMemory`; larger manifests are reservoir-sampled.
 * @param {string} table
 * @param {{ maxInMemory?: number }} [options]
 */
async function createIdSampler(table, { maxInMemory = 5_000_000 } = {}) {
  const filePath = manifestPath(table);
  const ids = [];
  let seen = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const id = line.trim();
    if (!id) {
      continue;
    }

    seen += 1;
    if (seen <= maxInMemory) {
      ids.push(id);
    } else {
      const j = Math.floor(Math.random() * seen);
      if (j < maxInMemory) {
        ids[j] = id;
      }
    }
  }

  return {
    size: seen,
    sampled: seen > maxInMemory,
    length: ids.length,
    at(index) {
      return ids[index];
    },
    random() {
      return ids[Math.floor(Math.random() * ids.length)];
    },
    all() {
      return ids;
    },
  };
}

/**
 * Tee an id from every row into a manifest while the rows continue downstream.
 * Bounded memory: rows are never accumulated.
 * @param {Iterable<Object>|AsyncIterable<Object>} rows
 * @param {string} table
 * @param {string} [idColumn]
 */
function tapIds(rows, table, idColumn = 'id') {
  const filePath = manifestPath(table);
  const ws = fs.createWriteStream(filePath, { flags: 'w' });
  let count = 0;

  async function* tap() {
    for await (const row of rows) {
      count += 1;
      if (!ws.write(`${row[idColumn]}\n`)) {
        await once(ws, 'drain');
      }
      yield row;
    }
  }

  return {
    rows: tap(),
    async finish() {
      await new Promise((resolve, reject) => {
        ws.end((error) => (error ? reject(error) : resolve()));
      });
      return { filePath, count };
    },
  };
}

module.exports = {
  createIdSampler,
  manifestExists,
  manifestPath,
  readManifest,
  resetTmpDir,
  tapIds,
  writeManifest,
};
