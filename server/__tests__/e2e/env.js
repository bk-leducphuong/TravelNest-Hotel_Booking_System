/**
 * Loads server/.env.development for e2e runs, then applies e2e defaults.
 * Executed via `setupFiles` so values exist before test modules load.
 */
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env.development') });

// Target the live API. Prefer an explicit E2E_BASE_URL, else the app's own
// API_BASE_URL from the env file, else the local default.
process.env.E2E_BASE_URL =
  process.env.E2E_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Keycloak (ROPC) — fall back to the app's own Keycloak config.
process.env.E2E_KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL || process.env.KEYCLOAK_BASE_URL;
process.env.E2E_KEYCLOAK_REALM = process.env.E2E_KEYCLOAK_REALM || process.env.KEYCLOAK_REALM;
process.env.E2E_KEYCLOAK_CLIENT = process.env.E2E_KEYCLOAK_CLIENT || process.env.KEYCLOAK_CLIENT_ID;

// Known seeded guests (see wiki/Demo-Guide.md + Keycloak realm).
process.env.E2E_USERNAME = process.env.E2E_USERNAME || 'test@travelnest.com';
process.env.E2E_PASSWORD = process.env.E2E_PASSWORD || 'password123';
process.env.E2E_USERNAME_B = process.env.E2E_USERNAME_B || 'owner@travelnest.local';
process.env.E2E_PASSWORD_B = process.env.E2E_PASSWORD_B || 'Test@1234';

// A city that exists in the seeded dataset (note the spelling: "Ha Noi").
process.env.E2E_CITY = process.env.E2E_CITY || 'Ha Noi';

// Disable the global rate limiter for the run unless explicitly asked not to.
process.env.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED || 'false';
