/**
 * Script to clean up duplicate indexes from ALL tables in the database
 * Run this script once to remove duplicate indexes caused by repeated sync() calls
 *
 * Usage: node scripts/cleanup-duplicate-indexes.js
 */

require('module-alias/register');

const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');

async function cleanupDuplicateIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    logger.info('Starting duplicate index cleanup for all tables...\n');

    // Get all tables in the database
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME;
    `);

    logger.info(`Found ${tables.length} tables in database\n`);

    let totalIndexesDropped = 0;
    let tablesWithDuplicates = 0;

    // Process each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      logger.info(`\n=== Processing table: ${tableName} ===`);

      // Get all indexes for this table
      const [indexes] = await sequelize.query(`
        SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE,
          SEQ_IN_INDEX
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX;
      `);

      logger.info(`  Total index entries: ${indexes.length}`);

      // Count unique indexes
      const uniqueIndexNames = new Set(indexes.map((idx) => idx.INDEX_NAME));
      logger.info(`  Unique indexes: ${uniqueIndexNames.size}`);

      // Get duplicate indexes (same column, different names, excluding PRIMARY and foreign keys)
      const [duplicates] = await sequelize.query(`
        SELECT 
          GROUP_CONCAT(DISTINCT INDEX_NAME ORDER BY INDEX_NAME) as index_names,
          COLUMN_NAME,
          COUNT(DISTINCT INDEX_NAME) as duplicate_count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
          AND INDEX_NAME != 'PRIMARY'
        GROUP BY COLUMN_NAME, NON_UNIQUE
        HAVING COUNT(DISTINCT INDEX_NAME) > 1;
      `);

      if (duplicates.length > 0) {
        tablesWithDuplicates++;
        logger.info(`  Found ${duplicates.length} columns with duplicate indexes:`);

        for (const dup of duplicates) {
          const indexNames = dup.index_names.split(',');
          logger.info(`    Column: ${dup.COLUMN_NAME} - Indexes: ${indexNames.join(', ')}`);

          // Keep the first index (usually the original one), drop the rest
          for (let i = 1; i < indexNames.length; i++) {
            const indexName = indexNames[i].trim();
            try {
              // Check if this is a foreign key constraint
              const [fkCheck] = await sequelize.query(`
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = '${tableName}'
                  AND CONSTRAINT_NAME = '${indexName}'
                  AND REFERENCED_TABLE_NAME IS NOT NULL;
              `);

              if (fkCheck.length > 0) {
                logger.info(`      Skipping ${indexName} (foreign key constraint)`);
                continue;
              }

              await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\`;`);
              logger.info(`      ✓ Dropped duplicate index: ${indexName}`);
              totalIndexesDropped++;
            } catch (error) {
              logger.error(`      ✗ Failed to drop index ${indexName}: ${error.message}`);
            }
          }
        }
      } else {
        logger.info('  No duplicate indexes found');
      }

      // Show final index count for this table
      const [finalIndexes] = await sequelize.query(`
        SELECT COUNT(DISTINCT INDEX_NAME) as index_count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}';
      `);

      logger.info(`  Final index count: ${finalIndexes[0].index_count}`);
    }

    // Summary
    logger.info('\n=== CLEANUP SUMMARY ===');
    logger.info(`Tables processed: ${tables.length}`);
    logger.info(`Tables with duplicates: ${tablesWithDuplicates}`);
    logger.info(`Total indexes dropped: ${totalIndexesDropped}`);

    await sequelize.close();
    logger.info('\nCleanup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicateIndexes();
