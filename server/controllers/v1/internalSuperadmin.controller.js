const internalSuperadminService = require('@services/internalSuperadmin.service');
const notificationTestService = require('@services/notificationTest.service');

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

async function runImageSeeder(req, res) {
  const result = await internalSuperadminService.runImageSeeder(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runCityImageSeeder(req, res) {
  const result = await internalSuperadminService.runCityImageSeeder(req.body);

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

async function previewNotificationTargets(req, res) {
  const result = await notificationTestService.previewTargets(req.query, {
    requireEmail: req.query.requireEmail === 'true',
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function sendTestNotification(req, res) {
  const result = await notificationTestService.sendTestInAppNotification(req.body, req.body, {
    userId: req.user?.id || req.session?.user?.id || null,
    requestId: req.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function sendTestEmail(req, res) {
  const result = await notificationTestService.sendTestEmail(req.body, req.body, {
    userId: req.user?.id || req.session?.user?.id || null,
    requestId: req.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  listTasks,
  initDatabase,
  runDatabaseSeeder,
  runImageSeeder,
  runCityImageSeeder,
  setupElasticsearch,
  runElasticsearchSeeder,
  runMongodbSeeder,
  previewNotificationTargets,
  sendTestNotification,
  sendTestEmail,
};
