const logger = require('@config/logger.config');

/**
 * Add job to queue with priority
 * @param {Queue} queue - BullMQ queue instance
 * @param {string} jobName - Job name/type
 * @param {object} data - Job data
 * @param {object} options - Job options (priority, delay, etc.)
 * @returns {Promise<Job>}
 */
async function addJob(queue, jobName, data, options = {}) {
  try {
    const job = await queue.add(jobName, data, {
      priority: options.priority || 5,
      delay: options.delay || 0,
      jobId: options.jobId,
      ...options,
    });

    logger.info(`Job added to queue: ${queue.name}`, {
      jobId: job.id,
      jobName,
      priority: options.priority,
    });

    return job;
  } catch (error) {
    logger.error(`Failed to add job to queue: ${queue.name}`, {
      jobName,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add multiple jobs in bulk
 * @param {Queue} queue - BullMQ queue instance
 * @param {Array} jobs - Array of {name, data, opts}
 * @returns {Promise<Array<Job>>}
 */
async function addBulkJobs(queue, jobs) {
  try {
    const addedJobs = await queue.addBulk(jobs);

    logger.info(`Bulk jobs added to queue: ${queue.name}`, {
      count: addedJobs.length,
    });

    return addedJobs;
  } catch (error) {
    logger.error(`Failed to add bulk jobs to queue: ${queue.name}`, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get job by ID
 * @param {Queue} queue - BullMQ queue instance
 * @param {string} jobId - Job ID
 * @returns {Promise<Job|null>}
 */
async function getJob(queue, jobId) {
  try {
    return await queue.getJob(jobId);
  } catch (error) {
    logger.error(`Failed to get job: ${jobId}`, {
      queue: queue.name,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Pause queue
 */
async function pauseQueue(queue) {
  await queue.pause();
  logger.info(`Queue paused: ${queue.name}`);
}

/**
 * Resume queue
 */
async function resumeQueue(queue) {
  await queue.resume();
  logger.info(`Queue resumed: ${queue.name}`);
}

/**
 * Clean old jobs
 * @param {Queue} queue - BullMQ queue instance
 * @param {number} grace - Grace period in ms
 * @param {string} status - Job status (completed, failed)
 * @returns {Promise<number>} Number of jobs removed
 */
async function cleanQueue(queue, grace = 86400000, status = 'completed') {
  try {
    const count = await queue.clean(grace, 1000, status);
    logger.info(`Cleaned ${count} ${status} jobs from queue: ${queue.name}`);
    return count;
  } catch (error) {
    logger.error(`Failed to clean queue: ${queue.name}`, {
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  addJob,
  addBulkJobs,
  getJob,
  pauseQueue,
  resumeQueue,
  cleanQueue,
};
