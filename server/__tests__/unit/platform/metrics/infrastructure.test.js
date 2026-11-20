const { createMetrics } = require('@platform/metrics');
const { createPoolGauges } = require('@platform/metrics/infrastructure/pool.metrics');
const {
  QUEUE_STATES,
  createQueueGauges,
} = require('@platform/metrics/infrastructure/queue-depth.metrics');

function registry() {
  return createMetrics({ collectDefault: false }).registry;
}

describe('platform/metrics pool gauges', () => {
  it('renders the pool state from the live getter', async () => {
    const reg = registry();
    const pool = { using: 3, available: 2, waiting: 1, maxSize: 10 };
    createPoolGauges(reg, () => pool);

    const body = await reg.metrics();
    expect(body).toContain('db_pool_connections{state="used"} 3');
    expect(body).toContain('db_pool_connections{state="idle"} 2');
    expect(body).toContain('db_pool_connections{state="waiting"} 1');
    expect(body).toContain('db_pool_connections_max 10');
  });

  it('omits series while the pool is not created yet', async () => {
    const reg = registry();
    createPoolGauges(reg, () => undefined);

    const body = await reg.metrics();
    expect(body).not.toContain('db_pool_connections{state=');
  });
});

describe('platform/metrics queue depth gauges', () => {
  it('does not track the ever-growing completed bucket', () => {
    expect(QUEUE_STATES).not.toContain('completed');
    expect(QUEUE_STATES).toContain('failed');
  });

  it('exports job counts by queue and state', async () => {
    const reg = registry();
    const queue = {
      name: 'holdExpiry',
      getJobCounts: async () => ({
        waiting: 4,
        active: 1,
        delayed: 2,
        failed: 3,
        paused: 0,
        completed: 999,
      }),
    };
    createQueueGauges(reg, () => [queue]);

    const body = await reg.metrics();
    expect(body).toContain('bullmq_queue_jobs{queue="holdExpiry",state="waiting"} 4');
    expect(body).toContain('bullmq_queue_jobs{queue="holdExpiry",state="active"} 1');
    expect(body).toContain('bullmq_queue_jobs{queue="holdExpiry",state="delayed"} 2');
    expect(body).toContain('bullmq_queue_jobs{queue="holdExpiry",state="failed"} 3');
    expect(body).toContain('bullmq_queue_jobs{queue="holdExpiry",state="paused"} 0');
    expect(body).not.toContain('state="completed"');
  });

  it('keeps scraping when one queue fails', async () => {
    const reg = registry();
    const queues = [
      { name: 'broken', getJobCounts: async () => Promise.reject(new Error('redis down')) },
      { name: 'healthy', getJobCounts: async () => ({ waiting: 2 }) },
    ];
    createQueueGauges(reg, () => queues);

    const body = await reg.metrics();
    expect(body).not.toContain('queue="broken"');
    expect(body).toContain('bullmq_queue_jobs{queue="healthy",state="waiting"} 2');
  });
});
