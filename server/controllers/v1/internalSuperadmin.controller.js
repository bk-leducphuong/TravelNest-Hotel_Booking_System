const internalSuperadminService = require('@services/internalSuperadmin.service');

async function listTasks(req, res) {
  res.status(200).json({
    success: true,
    data: internalSuperadminService.listTasks(),
  });
}

async function initDatabase(req, res) {
  const result = await internalSuperadminService.initDatabase(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runDatabaseSeeder(req, res) {
  const result = await internalSuperadminService.runDatabaseSeeder(req.params.seeder, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function setupElasticsearch(req, res) {
  const result = await internalSuperadminService.setupElasticsearch(req.params.target, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runElasticsearchSeeder(req, res) {
  const result = await internalSuperadminService.runElasticsearchSeeder(
    req.params.target,
    req.body
  );

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runMongodbSeeder(req, res) {
  const result = await internalSuperadminService.runMongodbSeeder(req.params.target, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  listTasks,
  initDatabase,
  runDatabaseSeeder,
  setupElasticsearch,
  runElasticsearchSeeder,
  runMongodbSeeder,
};
