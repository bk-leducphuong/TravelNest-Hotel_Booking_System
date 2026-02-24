const db = require('../../models');

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    await db.sequelize.authenticate();
    console.log('Database connection established');

    console.log('Initializing tables (sequelize.sync)...');
    await db.sequelize.sync({ alter: false, force: false });
    console.log('All tables are initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await db.sequelize.close();
      console.log('Database connection closed');
    } catch (closeError) {
      console.error('Failed to close database connection:', closeError);
    }
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
