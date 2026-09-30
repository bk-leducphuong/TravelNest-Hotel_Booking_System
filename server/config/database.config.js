const { createSequelize } = require('./database.options');

// Connection, pool and retry settings all live in `config/database.options.js` so
// the app runtime and sequelize-cli cannot drift apart.
const sequelize = createSequelize();

module.exports = sequelize;
