# Trestay Platform

Read-only, cross-hotel monitoring console for platform staff. Built with Nuxt 4
(SPA), Vue, Pinia, Tailwind, Element Plus, TypeScript and Keycloak OIDC/PKCE.

The console includes Overview, Hotels and hotel details, Users and user details,
Finance summary/payments/refunds/payouts/ledger, and Audit log. It uses global
`platform.*` permissions and never sends a hotel-scoping `X-Hotel-Id` header.
Server-side authorization and PII masking remain authoritative.

The UI migration covers all existing pages plus missing-page recovery. Shared
EN/VI controls, responsive navigation and data tables, URL-backed filtering,
read-only record drawers and explicit loading/error/empty states follow the
existing guest/hotel-admin foundations. See the
[update plan](../docs/plan/superadmin-ui-ux-update.md) and
[implementation report and screenshots](../docs/reports/progress/superadmin-ui-redesign.md).

Date filters use UTC calendar days, including the entire selected end date.
Finance totals remain separated by currency. Snapshot Refresh retrieves stored
counts; it does not recalculate them. Finance/audit drawers inspect the returned
list row; they do not introduce unsupported detail APIs or mutation actions.

## Development

From the repository root, run `yarn install --immutable`, configure a local
`superadmin-client/.env` using `.env.example`, then run `yarn dev:superadmin`.
The development port is 8100. API and Keycloak configuration use the
`NUXT_PUBLIC_*` variables listed in `.env.example`.

Only global `admin` / `support_agent` identities enter the console. Destinations
also require their matching global permission. Staff without Overview access can
sign in to their first permitted destination. Support PII is masked by the API;
`platform.user.pii_read` controls unmasked access and server audit behavior.

## Verification

```bash
yarn workspace @travelnest/superadmin-client lint
yarn workspace @travelnest/superadmin-client typecheck
yarn workspace @travelnest/superadmin-client test:ci
yarn workspace @travelnest/superadmin-client test:browser
yarn build:superadmin
yarn workspace @travelnest/superadmin-client test:e2e
```

Install Chromium with `yarn workspace @travelnest/superadmin-client exec playwright install chromium`
or set `CHROME_PATH=/usr/bin/google-chrome` for the browser fixture suite.

`test:browser` builds a separate Nuxt app under `tests/fixtures/console`, serves
it on port 8115, and intercepts its API reads with synthetic responses. Its
session plugin is registered only in the fixture config, never the production
app. This verifies frontend behavior, not real Keycloak/API authorization.
The existing `test:e2e` checks the production login entry point on port 8100.
It rebuilds production; avoid concurrent builds in the same output directory.

## Deployment

Image CI is defined in `.github/workflows/superadmin-client.yml`; manifests live
under `deploy/k8s/apps/superadmin-client`. Production releases follow the existing
Argo CD workflow in [CICD.md](../deploy/docs/CICD.md). Real identity-provider and
API checks remain separate release validation.
