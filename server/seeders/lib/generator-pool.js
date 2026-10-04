/**
 * Parallel CSV shard generation using `worker_threads`.
 *
 * Rows are generated for each `[start, count)` slice in a worker and written to
 * `.seed-tmp/shards/<table>.<i>.csv`; the caller then loads the files into MySQL
 * with `bulk.loadFiles`. This trades temporary disk space for CPU parallelism
 * during generation of the largest, DB-independent tables (currently `hotels`).
 */

const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const { ensureTmpDir } = require('./env');

const WORKER_PATH = path.join(__dirname, 'generate-shard-worker.js');

function runWorker(payload) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: payload });
    let settled = false;

    const settle = (fn, value) => {
      if (!settled) {
        settled = true;
        fn(value);
      }
    };

    worker.once('message', (message) => {
      if (message && message.error) {
        settle(reject, new Error(message.error));
      } else {
        settle(resolve, message);
      }
    });
    worker.once('error', (error) => settle(reject, error));
    worker.once('exit', (code) => {
      if (code !== 0) {
        settle(reject, new Error(`Shard worker exited with code ${code}`));
      }
    });
  });
}

/**
 * Generate `total` rows as `shards` CSV files in parallel.
 * @param {Object} options
 * @param {string} options.generatorPath absolute path to the generator module
 * @param {string} options.table
 * @param {string[]} options.columns
 * @param {Object} options.context structured-clone-safe generator context
 * @param {number} options.total
 * @param {number} options.shards
 * @param {number} [options.concurrency]
 * @returns {Promise<{ files: string[], dir: string }>}
 */
async function generateShards({
  generatorPath,
  table,
  columns,
  context,
  total,
  shards,
  concurrency = Math.min(shards, 4),
  log = console.log,
}) {
  const dir = path.join(ensureTmpDir(), 'shards');
  fs.mkdirSync(dir, { recursive: true });

  const size = Math.ceil(total / shards);
  const jobs = [];

  for (let index = 0; index < shards; index += 1) {
    const start = index * size;
    const count = Math.min(size, total - start);
    if (count <= 0) {
      break;
    }
    jobs.push({
      generatorPath,
      columns,
      context,
      start,
      count,
      filePath: path.join(dir, `${table}.${index}.csv`),
    });
  }

  log(
    `   🧵 Generating ${total} row(s) across ${jobs.length} shard(s) ` +
      `with ${Math.min(concurrency, jobs.length)} worker(s)`
  );

  const files = [];
  let cursor = 0;

  async function consume() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      const result = await runWorker(job);
      files.push(result.filePath);
    }
  }

  const lanes = Math.min(concurrency, jobs.length);
  await Promise.all(Array.from({ length: lanes }, consume));

  return { files, dir };
}

function cleanupShards(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; a leftover scratch dir is harmless.
  }
}

module.exports = {
  cleanupShards,
  generateShards,
};
