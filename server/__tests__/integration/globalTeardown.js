const { stopTestContainers } = require('./test-container');

module.exports = async () => {
  await stopTestContainers();
};
