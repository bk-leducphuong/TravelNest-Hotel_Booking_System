function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun: false,
    resume: false,
    limit: null,
    email: null,
    batchId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--resume') {
      args.resume = true;
      continue;
    }

    if (token.startsWith('--limit=')) {
      args.limit = Number.parseInt(token.split('=')[1], 10);
      continue;
    }

    if (token === '--limit') {
      args.limit = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (token.startsWith('--email=')) {
      args.email = token.split('=')[1]?.trim().toLowerCase() || null;
      continue;
    }

    if (token === '--email') {
      args.email = argv[index + 1]?.trim().toLowerCase() || null;
      index += 1;
      continue;
    }

    if (token.startsWith('--batch-id=')) {
      args.batchId = token.split('=')[1]?.trim() || null;
      continue;
    }

    if (token === '--batch-id') {
      args.batchId = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    throw new Error('--limit must be a positive integer');
  }

  return args;
}

module.exports = {
  parseArgs,
};
