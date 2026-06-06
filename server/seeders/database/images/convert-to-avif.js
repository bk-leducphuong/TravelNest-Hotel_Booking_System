#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.gif']);

const ROOT_DIR = __dirname;

function parseArgs(argv) {
  const options = {
    quality: 50,
    effort: 6,
    overwrite: false,
    deleteOriginals: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--overwrite') {
      options.overwrite = true;
    } else if (arg === '--delete-originals') {
      options.deleteOriginals = true;
    } else if (arg === '--quality') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        throw new Error('--quality must be an integer from 1 to 100');
      }
      options.quality = value;
      index += 1;
    } else if (arg === '--effort') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 0 || value > 9) {
        throw new Error('--effort must be an integer from 0 to 9');
      }
      options.effort = value;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Convert all images under this folder to AVIF.

Usage:
  node convert-to-avif.js [options]

Options:
  --quality <1-100>      AVIF quality. Default: 50
  --effort <0-9>         Compression effort. Higher is slower/smaller. Default: 6
  --overwrite            Recreate AVIF files that already exist.
  --delete-originals     Delete source files after successful conversion.
  -h, --help             Show this help message.
`);
}

async function collectImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectImages(absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension)) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function convertImage(sourcePath, options) {
  const targetPath = sourcePath.replace(/\.[^.]+$/, '.avif');
  const relativeSource = path.relative(ROOT_DIR, sourcePath);
  const relativeTarget = path.relative(ROOT_DIR, targetPath);

  if (!options.overwrite && (await fileExists(targetPath))) {
    return { status: 'skipped', source: relativeSource, target: relativeTarget };
  }

  await sharp(sourcePath)
    .rotate()
    .avif({
      quality: options.quality,
      effort: options.effort,
    })
    .toFile(targetPath);

  const sourceStats = await fs.stat(sourcePath);
  const targetStats = await fs.stat(targetPath);

  if (options.deleteOriginals) {
    await fs.unlink(sourcePath);
  }

  return {
    status: 'converted',
    source: relativeSource,
    target: relativeTarget,
    sourceBytes: sourceStats.size,
    targetBytes: targetStats.size,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const images = await collectImages(ROOT_DIR);

  if (images.length === 0) {
    console.log('No source images found.');
    return;
  }

  let converted = 0;
  let skipped = 0;
  let originalBytes = 0;
  let avifBytes = 0;

  for (const imagePath of images) {
    const result = await convertImage(imagePath, options);

    if (result.status === 'skipped') {
      skipped += 1;
      console.log(`Skipped ${result.source} -> ${result.target}`);
      continue;
    }

    converted += 1;
    originalBytes += result.sourceBytes;
    avifBytes += result.targetBytes;

    const savedPercent =
      result.sourceBytes === 0
        ? 0
        : Math.round((1 - result.targetBytes / result.sourceBytes) * 100);

    console.log(
      `Converted ${result.source} -> ${result.target} (${formatBytes(
        result.sourceBytes
      )} -> ${formatBytes(result.targetBytes)}, ${savedPercent}% smaller)`
    );
  }

  const totalSavedPercent =
    originalBytes === 0 ? 0 : Math.round((1 - avifBytes / originalBytes) * 100);

  console.log(
    `Done. Converted: ${converted}, skipped: ${skipped}, total: ${formatBytes(
      originalBytes
    )} -> ${formatBytes(avifBytes)} (${totalSavedPercent}% smaller).`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
