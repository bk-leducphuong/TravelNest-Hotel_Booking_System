/**
 * Source-image loading and row builders for the fast image seeder.
 *
 * All entities reuse the same handful of source files under
 * `seeders/database/images/{hotels,rooms}`, so each source is decoded once
 * (with `sharp`) and its `medium_webp` variant built once, then reused for
 * every entity. This makes variant "generation" a one-time cost instead of a
 * per-image one.
 */

const fs = require('fs');
const path = require('path');

const sharp = require('sharp');
const { uuidv7 } = require('uuidv7');

const HOTEL_DIR = path.join(__dirname, '..', 'database', 'images', 'hotels');
const ROOM_DIR = path.join(__dirname, '..', 'database', 'images', 'rooms');
const CITY_DIR = path.join(__dirname, '..', 'database', 'images', 'city', 'vietnam');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const VARIANT_TYPE = 'medium_webp';
const VARIANT_MIME = 'image/webp';
const VARIANT_MAX_SIZE = 800;

const IMAGE_COLUMNS = [
  'id',
  'entity_type',
  'entity_id',
  'bucket_name',
  'object_key',
  'original_filename',
  'file_size',
  'mime_type',
  'width',
  'height',
  'has_thumbnail',
  'has_compressed',
  'display_order',
  'is_primary',
  'status',
  'uploaded_at',
  'updated_at',
];

const VARIANT_COLUMNS = [
  'id',
  'image_id',
  'variant_type',
  'bucket_name',
  'object_key',
  'file_size',
  'width',
  'height',
  'created_at',
];

/**
 * Load image "albums" from a base directory.
 *
 * Supported structures:
 * - Flat:   images/hotels/*.jpg        → one album
 * - Nested: images/hotels/<dir>/*.jpg  → one album per subdirectory
 */
function loadAlbumFiles(baseDir) {
  const albums = [];

  if (!fs.existsSync(baseDir)) {
    return albums;
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  const directFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(baseDir, entry.name))
    .filter((fullPath) => IMAGE_EXTENSIONS.has(path.extname(fullPath).toLowerCase()));

  if (directFiles.length > 0) {
    albums.push(directFiles);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const files = fs
      .readdirSync(path.join(baseDir, entry.name))
      .map((name) => path.join(baseDir, entry.name, name))
      .filter((fullPath) => IMAGE_EXTENSIONS.has(path.extname(fullPath).toLowerCase()));

    if (files.length > 0) {
      albums.push(files);
    }
  }

  return albums;
}

/**
 * Decode one source file once: original buffer/metadata plus a `medium_webp`
 * variant. Falls back to the original bytes as the variant if `sharp` cannot
 * decode the source (e.g. missing codec), so seeding never aborts on that.
 */
async function buildSourceDescriptor(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';

  let width = null;
  let height = null;
  let variantBuffer = buffer;
  let variantMimeType = mimeType;
  let variantWidth = null;
  let variantHeight = null;

  try {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width ?? null;
    height = metadata.height ?? null;

    variantBuffer = await sharp(buffer)
      .resize({
        width: VARIANT_MAX_SIZE,
        height: VARIANT_MAX_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const variantMetadata = await sharp(variantBuffer).metadata();
    variantMimeType = VARIANT_MIME;
    variantWidth = variantMetadata.width ?? width;
    variantHeight = variantMetadata.height ?? height;
  } catch {
    // Keep original bytes/dims as the variant; content type stays truthful.
  }

  return {
    buffer,
    ext,
    filename: path.basename(filePath),
    filePath,
    fileSize: buffer.length,
    height,
    mimeType,
    variantBuffer,
    variantFileSize: variantBuffer.length,
    variantHeight,
    variantMimeType,
    variantWidth,
    width,
  };
}

/**
 * Load every album under `dir`, returning arrays of source descriptors.
 * Each distinct file is decoded only once.
 */
async function loadSources(dir) {
  const albums = loadAlbumFiles(dir);
  const cache = new Map();
  const result = [];

  for (const album of albums) {
    const described = [];
    for (const filePath of album) {
      if (!cache.has(filePath)) {
        cache.set(filePath, buildSourceDescriptor(filePath));
      }
      described.push(await cache.get(filePath));
    }
    result.push(described);
  }

  return result;
}

function objectKey(entityType, entityId, imageId, ext) {
  return `${entityType}/${entityId}/${imageId}.${ext.replace(/^\./, '')}`;
}

function variantObjectKey(entityType, entityId, imageId) {
  return `${entityType}/${entityId}/${imageId}_medium.webp`;
}

/**
 * Build the `images`/`image_variants` rows and object uploads for one entity.
 * The first image in the album is the primary (is_primary = 1); the rest are
 * NULL so the `unique_primary` index stays satisfiable.
 */
function buildRows({ entityType, entityId, album, bucketName, now = new Date() }) {
  const images = [];
  const variants = [];
  const uploads = [];

  album.forEach((source, index) => {
    const imageId = uuidv7();
    const key = objectKey(entityType, entityId, imageId, source.ext);
    const variantKey = variantObjectKey(entityType, entityId, imageId);

    images.push({
      id: imageId,
      entity_type: entityType,
      entity_id: entityId,
      bucket_name: bucketName,
      object_key: key,
      original_filename: source.filename,
      file_size: source.fileSize,
      mime_type: source.mimeType,
      width: source.width,
      height: source.height,
      has_thumbnail: 1,
      has_compressed: 1,
      display_order: index,
      is_primary: index === 0 ? 1 : null,
      status: 'active',
      uploaded_at: now,
      updated_at: now,
    });

    variants.push({
      id: uuidv7(),
      image_id: imageId,
      variant_type: VARIANT_TYPE,
      bucket_name: bucketName,
      object_key: variantKey,
      file_size: source.variantFileSize,
      width: source.variantWidth,
      height: source.variantHeight,
      created_at: now,
    });

    uploads.push({ key, buffer: source.buffer, contentType: source.mimeType });
    uploads.push({
      key: variantKey,
      buffer: source.variantBuffer,
      contentType: source.variantMimeType,
    });
  });

  return { images, variants, uploads };
}

module.exports = {
  CITY_DIR,
  HOTEL_DIR,
  IMAGE_COLUMNS,
  ROOM_DIR,
  VARIANT_COLUMNS,
  VARIANT_TYPE,
  buildRows,
  buildSourceDescriptor,
  loadAlbumFiles,
  loadSources,
  objectKey,
  variantObjectKey,
};
