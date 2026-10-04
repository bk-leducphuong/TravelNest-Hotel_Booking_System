const internal = require('@platform/internal');
const { notificationTest: notificationTestService } = require('@modules/notification');

async function listTasks(req, res) {
  res.status(200).json({
    success: true,
    data: internal.listTasks(),
  });
}

async function initDatabase(req, res) {
  const result = await internal.initDatabase(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runDatabaseSeeder(req, res) {
  const result = await internal.runDatabaseSeeder(req.params.seeder, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runImageSeeder(req, res) {
  const result = await internal.runImageSeeder(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runCityImageSeeder(req, res) {
  const result = await internal.runCityImageSeeder(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function setupElasticsearch(req, res) {
  const result = await internal.setupElasticsearch(req.params.target, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runElasticsearchSeeder(req, res) {
  const result = await internal.runElasticsearchSeeder(req.params.target, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function runMongodbSeeder(req, res) {
  const result = await internal.runMongodbSeeder(req.params.target, req.body);

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
    userId: req.user?.id || null,
    requestId: req.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function sendTestEmail(req, res) {
  const result = await notificationTestService.sendTestEmail(req.body, req.body, {
    userId: req.user?.id || null,
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
