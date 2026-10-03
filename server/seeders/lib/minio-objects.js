/**
 * MinIO helpers for the fast image seeder.
 *
 * Wraps the shared client from `config/minio.config.js` with a small
 * concurrency limiter so many object PUTs can be issued without exhausting
 * sockets.
 */

const { bucketName, initBucket, minioClient } = require('../../config/minio.config');

async function ensureBucket() {
  await initBucket();
  return bucketName;
}

async function putObject(objectKey, buffer, contentType) {
  await minioClient.putObject(bucketName, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return { objectKey, size: buffer.length };
}

/**
 * Remove many objects, de-duplicated and chunked (MinIO recommends ≤1000/call).
 */
async function removeObjectsInChunks(objectKeys, { chunkSize = 1000 } = {}) {
  const unique = Array.from(new Set(objectKeys)).filter(Boolean);

  for (let index = 0; index < unique.length; index += chunkSize) {
    await minioClient.removeObjects(bucketName, unique.slice(index, index + chunkSize));
  }

  return unique.length;
}

/**
 * Create a promise limiter that runs at most `concurrency` tasks at a time.
 * @param {number} concurrency
 * @returns {(task: () => Promise<*>) => Promise<*>}
 */
function createLimiter(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    active -= 1;
    const run = queue.shift();
    if (run) {
      run();
    }
  }

  return function limit(task) {
    return new Promise((resolve, reject) => {
      const run = () => {
        active += 1;
        return Promise.resolve().then(task).then(resolve, reject).finally(next);
      };

      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

module.exports = {
  bucketName,
  createLimiter,
  ensureBucket,
  putObject,
  removeObjectsInChunks,
};
