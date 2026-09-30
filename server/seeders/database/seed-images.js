/**
 * Fast image seeding CLI (direct MinIO + bulk metadata).
 *
 * Usage:
 *   node seeders/database/seed-images.js [options]
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const { runImages } = require('../lib/images');
const { createFastContext } = require('../lib/pipeline');

function parsePositiveInt(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer, received "${value}"`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = { help: false, replace: true };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--hotels-only') {
      options.entityTypes = ['hotel'];
    } else if (arg === '--rooms-only') {
      options.entityTypes = ['room'];
    } else if (arg === '--no-replace') {
      options.replace = false;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInt(arg.slice('--limit='.length), '--limit');
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parsePositiveInt(arg.slice('--concurrency='.length), '--concurrency');
    } else if (arg.startsWith('--entity-batch=')) {
      options.entityBatch = parsePositiveInt(arg.slice('--entity-batch='.length), '--entity-batch');
    } else if (arg.startsWith('--batch=')) {
      options.batchSize = parsePositiveInt(arg.slice('--batch='.length), '--batch');
    } else {
      console.warn(`⚠️  Unknown argument ignored: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Fast image seeding (direct MinIO upload + bulk metadata inserts).

Usage:
  node seeders/database/seed-images.js [options]

Options:
  --hotels-only          Only seed hotel images
  --rooms-only           Only seed room images
  --limit=N              Max entities per type (smoke testing)
  --concurrency=N        Parallel MinIO PUTs (default: 32)
  --entity-batch=N       Entities processed per batch (default: 200)
  --batch=N              Metadata rows per INSERT batch (default: 2000)
  --no-replace           Do not delete existing rows/objects first
  --help, -h             Show this message
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('  FAST IMAGE SEEDING (DIRECT MINIO)');
  console.log('='.repeat(80));

  const ctx = await createFastContext();

  try {
    const result = await runImages({ writer: ctx.writer, reader: ctx.reader, options });
    console.log(
      `\n✅ Images seeded: ${result.affectedRows} image(s) across ${result.entities} ` +
        `entit(ies), ${result.variants} variant(s) in ${(result.ms / 1000).toFixed(2)}s`
    );
  } finally {
    await ctx.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fast image seeding failed:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  parseArgs,
};
