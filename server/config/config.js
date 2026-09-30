// sequelize-cli configuration.
//
// Delegates entirely to `config/database.options.js`, which is also used by the
// application runtime. This guarantees `db:migrate` targets the same database,
// host, credentials and pool settings as the running API.
const { getCliConfig } = require('./database.options');

module.exports = getCliConfig();
