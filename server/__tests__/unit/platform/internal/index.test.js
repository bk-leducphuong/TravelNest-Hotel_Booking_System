const internal = require('@platform/internal');

describe('platform/internal', () => {
  it('lists the registered task groups', () => {
    const tasks = internal.listTasks();

    expect(tasks.databaseSeeders).toContain('user');
    expect(tasks.databaseSeeders).toContain('all');
    expect(tasks.elasticsearchSetup).toContain('hotels');
    expect(tasks.elasticsearchSeeders).toContain('destinations');
    expect(tasks.mongodbSeeders).toContain('search_logs');
    expect(Array.isArray(tasks.runningTasks)).toBe(true);
  });

  it('exposes the runner functions', () => {
    expect(typeof internal.initDatabase).toBe('function');
    expect(typeof internal.runDatabaseSeeder).toBe('function');
    expect(typeof internal.setupElasticsearch).toBe('function');
  });
});
