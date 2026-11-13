require('../../register-aliases');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const db = require('../../models');
const {
  backfillConversations,
} = require('../../modules/messaging/application/backfillConversations');

const USAGE = `
Backfill missing messaging conversations for existing bookings.

Usage:
  yarn workspace @travelnest/server messaging:backfill [options]

Options:
  --dry-run                 Report what would be created without writing.
  --all                     Ignore the default check-out >= today filter.
  --since=YYYY-MM-DD        Only bookings checking out on/after this date.
  --statuses=a,b            Booking statuses (default: confirmed,checked_in).
                            Expired bookings are always skipped.
  --hotel-id=UUID           Limit to one hotel.
  --booking-id=UUID         Backfill a single booking.
  --limit=N                 Stop after N bookings scanned.
  --batch-size=N            Rows per insert batch (default: 500).
  --help                    Show this help.

Examples:
  # Safe preview of active/future stays
  yarn workspace @travelnest/server messaging:backfill --dry-run

  # Include cancelled/completed stays from the last 90 days
  yarn workspace @travelnest/server messaging:backfill \\
    --since=$(date -d '90 days ago' +%F) \\
    --statuses=confirmed,checked_in,cancelled,completed,no_show

  # Everything, including historical bookings
  yarn workspace @travelnest/server messaging:backfill --all \\
    --statuses=confirmed,checked_in,cancelled,completed,no_show
`;

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  const value = (prefix) => {
    const arg = argv.find((entry) => entry.startsWith(`${prefix}=`));
    return arg ? arg.slice(prefix.length + 1) : null;
  };

  const statuses = value('--statuses');

  return {
    help: false,
    dryRun: argv.includes('--dry-run'),
    all: argv.includes('--all'),
    since: value('--since'),
    statuses: statuses ? statuses.split(',') : undefined,
    hotelId: value('--hotel-id'),
    bookingId: value('--booking-id'),
    limit: value('--limit') ?? undefined,
    batchSize: value('--batch-size') ?? undefined,
  };
}

function printSummary(result) {
  console.log('\nMessaging conversation backfill');
  console.log('='.repeat(40));
  console.log(`Mode: ${result.dryRun ? 'dry-run' : 'insert'}`);
  console.log(`Statuses: ${result.statuses.join(', ')}`);
  console.log(
    `Date filter: ${result.all ? 'all dates' : result.since ? `>= ${result.since}` : '>= today'}`
  );
  if (result.hotelId) console.log(`Hotel: ${result.hotelId}`);
  if (result.bookingId) console.log(`Booking: ${result.bookingId}`);
  console.log(`Batches: ${result.batches}`);
  console.log(`Bookings scanned: ${result.scanned}`);
  console.log(`${result.dryRun ? 'Would create' : 'Created'}: ${result.created}`);
  console.log('');
}

async function main() {
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (options.help) {
    console.log(USAGE);
    process.exit(0);
  }

  try {
    await db.sequelize.authenticate();
    const result = await backfillConversations({
      sequelize: db.sequelize,
      ...options,
    });
    printSummary(result);
    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    await db.sequelize.close().catch(() => null);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  printSummary,
};
