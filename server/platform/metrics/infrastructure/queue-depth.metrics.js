const client = require('prom-client');

const { getMetrics } = require('./registry');

/** Queue states that matter operationally; `completed` just grows forever. */
const QUEUE_STATES = ['waiting', 'active', 'delayed', 'failed', 'paused'];

let registered = false;

/**
 * BullMQ queue-depth gauges.
 *
 * `getJobCounts()` is called on scrape rather than on a timer: no background
 * polling when nobody is looking, and the value is always fresh.
 *
 * @param {object} registry prom-client Registry
 * @param {() => object[]} getQueues returns the Queue instances
 */
function createQueueGauges(registry, getQueues) {
  const jobs = new client.Gauge({
    name: 'bullmq_queue_jobs',
    help: 'BullMQ job counts, by queue and state',
    labelNames: ['queue', 'state'],
    registers: [registry],
    async collect() {
      const queues = getQueues() || [];
      const results = await Promise.allSettled(queues.map((queue) => queue.getJobCounts()));

      results.forEach((result, index) => {
        const queue = queues[index];
        if (!queue || result.status !== 'fulfilled') {
          return;
        }

        const counts = result.value || {};

        for (const state of QUEUE_STATES) {
          const value = Number(counts[state]);
          this.set({ queue: queue.name, state }, Number.isFinite(value) ? value : 0);
        }
      });
    },
  });

  return { jobs };
}

/**
 * Register queue gauges on the process registry. Idempotent.
 *
 * @param {() => object[]} getQueues
 */
function instrumentQueueDepths(getQueues) {
  if (registered || typeof getQueues !== 'function') {
    return;
  }

  createQueueGauges(getMetrics().registry, getQueues);
  registered = true;
}

module.exports = {
  QUEUE_STATES,
  createQueueGauges,
  instrumentQueueDepths,
};
