/* eslint-disable no-console */
/**
 * Architecture guardrails (ratchet).
 *
 * The backend is a modular monolith (see wiki/Modular-Monolith.md) built on top
 * of a legacy MVC layer. The intended rules are:
 *
 *   1. A module's internals are private. Cross-module access must go through
 *      `@modules/<name>` (the public index), never `@modules/<name>/<subpath>`.
 *   2. Layers only depend "downwards": controller -> service -> repository ->
 *      model. In particular controllers must not talk to the DB directly, and
 *      services must not reach around repositories to Sequelize.
 *   3. No file grows into a god object. Big files are where coupling hides.
 *
 * Rules 1 is enforced hard. Rules 2 and 3 are currently violated by existing
 * code, so they are enforced as a *ratchet*: the committed baseline records the
 * current debt, and this script fails if any metric gets worse. Fix something
 * and lower the baseline (`npm run arch:baseline`); never raise it casually.
 *
 * Run with `npm run arch:check`.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'architecture-baseline.json');

/** A file bigger than this is a god-file candidate. */
const MAX_FILE_LINES = 400;
/** A baselined god-file may drift up by this many lines before failing. */
const GOD_FILE_SLACK = 20;

/** Directories that are not application source. */
const SKIP_DIRS = new Set([
  'node_modules',
  'coverage',
  'logs',
  '__tests__',
  'seeders',
  'scripts',
  'docs',
  'infra',
  'public',
  'assets',
  '.cache',
  '.git',
]);

/** Path fragments (relative to server/) to skip even inside scanned dirs. */
const SKIP_FRAGMENTS = ['minio-data', 'elasticsearch/data'];

/**
 * Layer leaks that must not grow. Each entry counts import occurrences from
 * files in `dir` (first path segment) whose specifier matches one of `imports`.
 */
const LAYER_LEAKS = [
  {
    key: 'controllers -> @models|@repositories',
    dir: 'controllers',
    imports: [/^@models(\/|$)/, /^@repositories(\/|$)/],
  },
  {
    key: 'services -> @models',
    dir: 'services',
    imports: [/^@models(\/|$)/],
  },
  {
    key: 'services -> @config/database.config',
    dir: 'services',
    imports: [/^@config\/database\.config$/],
  },
];

/**
 * Couplings that are forbidden outright (hard zero). Modules reach the shared
 * model registry through the platform seam (`@platform/database`); importing the
 * legacy central path from a module is not allowed.
 */
const BLOCKING_LEAKS = [
  {
    key: 'modules -> @models',
    dir: 'modules',
    imports: [/^@models(\/|$)/],
  },
];

/**
 * Module couplings that are expected while the modular migration is in flight
 * (a module wrapping the shared repository or a not-yet-migrated service).
 * Reported for trend, never failed: blocking these would fight the migration.
 */
const WATCHLIST_LEAKS = [
  {
    key: 'modules -> @repositories',
    dir: 'modules',
    imports: [/^@repositories(\/|$)/],
  },
  {
    key: 'modules -> @services',
    dir: 'modules',
    imports: [/^@services(\/|$)/],
  },
];

/** `@modules/<name>/<anything>` is a cross-module internal import. */
const CROSS_MODULE_INTERNAL = /^@modules\/[^/]+\/.+/;

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_FRAGMENTS.some((fragment) => full.includes(fragment))) continue;
      walk(full, files);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      files.push(full);
    }
  }
  return files;
}

function toRel(absolute) {
  return path.relative(SERVER_ROOT, absolute).split(path.sep).join('/');
}

function firstSegment(relPath) {
  return relPath.split('/')[0];
}

function importsOf(source) {
  const specifiers = [];
  const requirePattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = requirePattern.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function collect() {
  const files = walk(SERVER_ROOT, []);
  const crossModule = [];
  const blocking = [];
  const layerLeaks = Object.fromEntries(LAYER_LEAKS.map((leak) => [leak.key, 0]));
  const watchlist = Object.fromEntries(WATCHLIST_LEAKS.map((leak) => [leak.key, 0]));
  const godFiles = {};

  for (const absolute of files) {
    const relPath = toRel(absolute);
    const segment = firstSegment(relPath);
    const source = fs.readFileSync(absolute, 'utf8');
    const specifiers = importsOf(source);

    for (const specifier of specifiers) {
      if (CROSS_MODULE_INTERNAL.test(specifier)) {
        crossModule.push({ file: relPath, specifier });
      }
      for (const leak of BLOCKING_LEAKS) {
        if (segment === leak.dir && leak.imports.some((pattern) => pattern.test(specifier))) {
          blocking.push({ key: leak.key, file: relPath, specifier });
        }
      }
      for (const leak of LAYER_LEAKS) {
        if (segment === leak.dir && leak.imports.some((pattern) => pattern.test(specifier))) {
          layerLeaks[leak.key] += 1;
        }
      }
      for (const leak of WATCHLIST_LEAKS) {
        if (segment === leak.dir && leak.imports.some((pattern) => pattern.test(specifier))) {
          watchlist[leak.key] += 1;
        }
      }
    }

    const lineCount = source.split('\n').length;
    if (lineCount > MAX_FILE_LINES) {
      godFiles[relPath] = lineCount;
    }
  }

  return { crossModule, blocking, layerLeaks, watchlist, godFiles };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(current) {
  const payload = {
    $comment:
      'Architecture debt baseline for scripts/check-architecture.js. Lower these numbers as debt is paid down; never raise them without review.',
    layerLeaks: current.layerLeaks,
    godFiles: Object.fromEntries(Object.entries(current.godFiles).sort()),
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote baseline to ${toRel(BASELINE_PATH)}`);
}

function report(current, baseline) {
  const failures = [];

  // Rule 1: hard, must stay at zero.
  if (current.crossModule.length > 0) {
    failures.push(
      `Cross-module internal imports (${current.crossModule.length}). ` +
        'Import the module public index instead, e.g. @modules/booking'
    );
    for (const violation of current.crossModule) {
      console.log(`  x ${violation.file} -> ${violation.specifier}`);
    }
  }

  // Rule 1b: blocked couplings, hard zero.
  if (current.blocking.length > 0) {
    failures.push(
      `Blocked module couplings (${current.blocking.length}). ` +
        'Reach the model registry through @platform/database instead.'
    );
    for (const item of current.blocking) {
      console.log(`  x ${item.file} -> ${item.specifier}  (${item.key})`);
    }
  }

  // Rule 2: layer leaks, ratcheted.
  console.log('\nLayer leaks (current / baseline):');
  for (const [key, count] of Object.entries(current.layerLeaks)) {
    const allowed = baseline.layerLeaks[key];
    const status = count > allowed ? 'REGRESSION' : 'ok';
    console.log(`  ${status.padEnd(10)} ${String(count).padStart(3)} / ${allowed}  ${key}`);
    if (count > allowed) {
      failures.push(`Layer leak "${key}" grew from ${allowed} to ${count}`);
    }
  }

  // Watchlist: transitional module couplings, tracked but not enforced.
  console.log('\nModule coupling watchlist (informational, not enforced):');
  for (const [key, count] of Object.entries(current.watchlist)) {
    console.log(`  ${String(count).padStart(3)}  ${key}`);
  }

  // Rule 3: god files, ratcheted.
  console.log('\nGod files > 400 lines (current / baseline):');
  const baselinedGodFiles = baseline.godFiles || {};
  let godFileFailures = 0;
  for (const [relPath, loc] of Object.entries(current.godFiles).sort((a, b) => b[1] - a[1])) {
    const allowed = baselinedGodFiles[relPath];
    if (allowed === undefined) {
      console.log(`  NEW        ${String(loc).padStart(4)} (unbaselined)  ${relPath}`);
      failures.push(`${relPath} is ${loc} lines and is not in the baseline`);
      godFileFailures += 1;
    } else if (loc > allowed + GOD_FILE_SLACK) {
      console.log(`  GREW       ${String(loc).padStart(4)} / ${allowed}  ${relPath}`);
      failures.push(`${relPath} grew from ${allowed} to ${loc} lines`);
      godFileFailures += 1;
    } else {
      console.log(`  ok         ${String(loc).padStart(4)} / ${allowed}  ${relPath}`);
    }
  }
  if (godFileFailures === 0) {
    console.log('  (no new or growing god files)');
  }

  const fixed = Object.keys(baselinedGodFiles).filter((key) => !(key in current.godFiles));
  if (fixed.length > 0) {
    console.log(`\nFixed (now under ${MAX_FILE_LINES} lines; run \`npm run arch:baseline\`):`);
    fixed.forEach((key) => console.log(`  - ${key}`));
  }

  return failures;
}

function main() {
  const current = collect();

  if (process.argv.includes('--update-baseline')) {
    writeBaseline(current);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error(
      'No baseline found. Generate it with `npm run arch:baseline` and commit the result.'
    );
    process.exit(1);
  }

  console.log('Architecture check\n==================');
  const failures = report(current, baseline);

  if (failures.length > 0) {
    console.error(`\nAt least one architecture rule regressed (${failures.length}):`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    console.error(
      '\nFix the code, or (if the debt is intentional and reviewed) run `npm run arch:baseline`.'
    );
    process.exit(1);
  }

  console.log('\nArchitecture check passed.');
}

main();
