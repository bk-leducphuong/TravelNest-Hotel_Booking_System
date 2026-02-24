const { startTestContainers } = require('./test-container');

module.exports = async () => {
  await startTestContainers();
};
