/**
 * Database model-registry seam.
 *
 * `models/index.js` initializes every Sequelize model — core, module and
 * platform — on the shared connection and wires their associations. Modules
 * must not import that legacy path directly: they reach the registry through
 * this platform seam instead. That keeps the registry's location an
 * implementation detail (it can move later without touching every module) and
 * gives the architecture check a single sanctioned import to allow.
 *
 * The object returned is the same `db` registry, so callers still destructure
 * the initialized models, e.g.:
 *
 *   const { Bookings, Hotels } = require('@platform/database');
 */
module.exports = require('@models');
