/**
 * Worker-thread entry point for parallel shard generation.
 *
 * Receives a generator module path, its column list, a structured-clone-safe
 * context and a `[start, count)` slice. Writes the slice as a CSV file and
 * reports the file path back to the parent thread.
 */

const fs = require('fs');
const { pipeline } = require('stream/promises');
const { parentPort, workerData } = require('worker_threads');

const { rowsToCsvStream } = require('./csv');
const { loadFaker } = require('./faker');

async function run() {
  const { generatorPath, columns, context, start, count, filePath } = workerData;

  const generator = require(generatorPath);
  const faker = await loadFaker();
  const rows = generator.createRows({ ...context, faker, start, count });

  await pipeline(rowsToCsvStream(rows, columns), fs.createWriteStream(filePath));

  return { filePath, count };
}

run()
  .then((result) => parentPort.postMessage(result))
  .catch((error) => parentPort.postMessage({ error: error.message }));
