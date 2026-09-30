/**
 * Fast image seeder: writes objects straight to MinIO and bulk-inserts the
 * `images` + `image_variants` metadata rows.
 *
 * This bypasses the API/media-service/NATS pipeline used by
 * `seeders/database/images.seed.js`. It mirrors the media service's resulting
 * state (object keys, `is_primary` semantics, `medium_webp` variant, active
 * status) without the per-image HTTP round trips or the consumer's
 * download-and-re-upload.
 */

const {
  bucketName,
  createLimiter,
  ensureBucket,
  putObject,
  removeObjectsInChunks,
} = require('./minio-objects');
const { insertRows, streamQuery } = require('./bulk');
const {
  CITY_DIR,
  HOTEL_DIR,
  IMAGE_COLUMNS,
  ROOM_DIR,
  VARIANT_COLUMNS,
  buildRows,
  loadSources,
} = require('../generate/images.gen');

const ENTITY_TYPES = {
  hotel: {
    dir: HOTEL_DIR,
    sql: "SELECT `id` FROM `hotels` WHERE `status` = 'active' ORDER BY `id` ASC",
  },
  room: {
    dir: ROOM_DIR,
    sql: "SELECT `id` FROM `rooms` WHERE `status` = 'active' ORDER BY `id` ASC",
  },
  city: {
    dir: CITY_DIR,
    sql: 'SELECT `id`, `name` FROM `cities` ORDER BY `name` ASC',
  },
};

/**
 * Pick the album of source images for one entity.
 *
 * Hotels/rooms cycle through whole albums. Cities get a single primary image,
 * matched by city name when a file of that name exists, otherwise round-robin.
 */
function selectAlbum(entityType, albums, index, entity) {
  if (albums.length === 0) {
    return [];
  }

  if (entityType === 'city') {
    const pool = albums[0] || [];
    if (pool.length === 0) {
      return [];
    }
    const wanted = String(entity.name || '')
      .trim()
      .toLowerCase();
    const match = pool.find(
      (source) =>
        source.filename
          .replace(/\.[^.]+$/, '')
          .trim()
          .toLowerCase() === wanted
    );
    return [match || pool[index % pool.length]];
  }

  return albums[index % albums.length];
}

const CLEANUP_BATCH = 1000;
const DEFAULT_OPTIONS = {
  concurrency: 32,
  entityBatch: 200,
  batchSize: 2000,
  entityTypes: ['hotel', 'room', 'city'],
  limit: null,
  replace: true,
};

async function* chunked(iterable, size) {
  let buffer = [];
  for await (const item of iterable) {
    buffer.push(item);
    if (buffer.length >= size) {
      yield buffer;
      buffer = [];
    }
  }
  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Delete existing image/variant rows (and their MinIO objects) for an entity
 * type, keyset-paginated so it stays bounded on large tables.
 */
async function cleanupEntityType(
  writer,
  reader,
  entityType,
  { log = console.log, imageTable = 'images', variantTable = 'image_variants' } = {}
) {
  let lastId = '';
  let removed = 0;

  for (;;) {
    const rows = [];
    for await (const row of streamQuery(
      reader,
      'SELECT `id`, `object_key` FROM `' +
        imageTable +
        '` ' +
        'WHERE `entity_type` = ? AND `id` > ? ORDER BY `id` ASC LIMIT ?',
      [entityType, lastId, CLEANUP_BATCH]
    )) {
      rows.push(row);
    }

    if (rows.length === 0) {
      break;
    }

    const ids = rows.map((row) => row.id);
    const objectKeys = rows.map((row) => row.object_key);
    const [variantRows] = await writer.query(
      `SELECT \`object_key\` FROM \`${variantTable}\` WHERE \`image_id\` IN (?)`,
      [ids]
    );
    objectKeys.push(...variantRows.map((row) => row.object_key));

    await removeObjectsInChunks(objectKeys);
    await writer.query(`DELETE FROM \`${variantTable}\` WHERE \`image_id\` IN (?)`, [ids]);
    await writer.query(`DELETE FROM \`${imageTable}\` WHERE \`id\` IN (?)`, [ids]);

    removed += rows.length;
    lastId = rows[rows.length - 1].id;

    if (removed % 20000 === 0) {
      log(`   🗑️  Cleaned ${removed} ${entityType} image(s)`);
    }
  }

  return removed;
}

/**
 * Seed images for the configured entity types.
 * @param {Object} context
 * @param {*} context.writer - MySQL connection used for metadata inserts
 * @param {*} context.reader - separate MySQL connection used to stream entity ids
 * @param {Object} [options]
 * @returns {Promise<{ table: string, affectedRows: number, variants: number, entities: number, ms: number }>}
 */
async function runImages({ writer, reader, options = {} }) {
  const opts = { ...DEFAULT_OPTIONS };
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      opts[key] = value;
    }
  }
  const startedAt = Date.now();
  const imageTable = opts.imageTable || 'images';
  const variantTable = opts.variantTable || 'image_variants';

  await ensureBucket();

  let totalImages = 0;
  let totalVariants = 0;
  let totalEntities = 0;

  for (const entityType of opts.entityTypes) {
    const config = ENTITY_TYPES[entityType];
    if (!config) {
      console.warn(`   ⚠️  Unknown entity type "${entityType}" — skipping`);
      continue;
    }

    const albums = await loadSources(config.dir);
    if (albums.length === 0) {
      console.log(`   ⚠️  No ${entityType} source images found in ${config.dir} — skipping`);
      continue;
    }

    if (opts.replace) {
      const removed = await cleanupEntityType(writer, reader, entityType, {
        imageTable,
        variantTable,
      });
      console.log(`   🗑️  Removed ${removed} existing ${entityType} image row(s)`);
    }

    const limiter = createLimiter(opts.concurrency);
    const now = new Date();
    const sql = opts.limit ? `${config.sql} LIMIT ${Number(opts.limit)}` : config.sql;

    let albumIndex = 0;
    let entityCount = 0;
    let imageCount = 0;

    for await (const entities of chunked(streamQuery(reader, sql, []), opts.entityBatch)) {
      const uploads = [];
      const imageRows = [];
      const variantRows = [];

      for (const entity of entities) {
        const album = selectAlbum(entityType, albums, albumIndex, entity);
        albumIndex += 1;
        if (album.length === 0) {
          continue;
        }

        const built = buildRows({ entityType, entityId: entity.id, album, bucketName });
        for (const upload of built.uploads) {
          uploads.push(limiter(() => putObject(upload.key, upload.buffer, upload.contentType)));
        }
        imageRows.push(...built.images);
        variantRows.push(...built.variants);
      }

      await Promise.all(uploads);
      await insertRows(writer, imageTable, IMAGE_COLUMNS, imageRows, {
        batchSize: opts.batchSize,
      });
      await insertRows(writer, variantTable, VARIANT_COLUMNS, variantRows, {
        batchSize: opts.batchSize,
      });

      entityCount += entities.length;
      imageCount += imageRows.length;
      totalImages += imageRows.length;
      totalVariants += variantRows.length;
      totalEntities += entities.length;

      console.log(`   📊 ${entityType}: ${entityCount} entities, ${imageCount} image(s) this run`);
    }
  }

  return {
    table: 'images',
    affectedRows: totalImages,
    entities: totalEntities,
    variants: totalVariants,
    ms: Date.now() - startedAt,
  };
}

module.exports = {
  ENTITY_TYPES,
  cleanupEntityType,
  runImages,
};
