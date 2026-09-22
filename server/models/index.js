const fs = require('fs');
const path = require('path');

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = require('../config/database.config');

const db = {};

/**
 * Collect every directory that may contain Sequelize model definitions.
 *
 * Core/legacy models live in this folder. As modules and platform components
 * take ownership of their own tables, they place models under either:
 *   - <layer>/<component>/infrastructure/models/*.model.js   (modules)
 *   - <layer>/<component>/models/*.model.js                  (platform)
 *
 * Every model is still registered on the same `db` object so associations and
 * the existing `db.<name>` / `db.<PascalCase>` access patterns keep working.
 */
function listModelDirs() {
  const rootDir = __dirname;
  const dirs = [rootDir];

  const layerRoots = [path.join(rootDir, '..', 'modules'), path.join(rootDir, '..', 'platform')];

  for (const layerRoot of layerRoots) {
    if (!fs.existsSync(layerRoot)) {
      continue;
    }

    for (const entry of fs.readdirSync(layerRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const candidates = [
        path.join(layerRoot, entry.name, 'infrastructure', 'models'),
        path.join(layerRoot, entry.name, 'models'),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          dirs.push(candidate);
        }
      }
    }
  }

  return dirs;
}

function pascalCase(tableName) {
  return tableName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

for (const dir of listModelDirs()) {
  fs.readdirSync(dir)
    .filter((file) => file.endsWith('.model.js'))
    .forEach((file) => {
      const model = require(path.join(dir, file))(sequelize, DataTypes);
      // Use model name (table name) as key, but also create PascalCase alias for compatibility
      const tableName = model.name;
      db[tableName] = model;
      db[pascalCase(tableName)] = model;
    });
}

const associatedModels = new Set();

Object.keys(db).forEach((modelName) => {
  const model = db[modelName];
  // Only call associate once per model instance (not per alias)
  if (model.associate && !associatedModels.has(model)) {
    model.associate(db);
    associatedModels.add(model);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
