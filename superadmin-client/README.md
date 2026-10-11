# TravelNest Platform (superadmin client)

Cross-tenant monitoring console for the TravelNest platform. It shows all
hotels, users and finances in one place — as opposed to `admin-client`, which is
hotel-scoped and uses the `X-Hotel-Id` header.

> **Status:** Phase 0 scaffold. Only the **Overview** page is implemented; Hotels,
> Users, Audit (Phase 1) and Finance (Phase 2) pages land next. See
> [`../SUPERADMIN_PLAN.md`](../SUPERADMIN_PLAN.md).

## Stack

Nuxt 4 (SPA), Vue 3, Pinia, Tailwind CSS, Element Plus, TypeScript, Vitest,
Playwright, Keycloak (`keycloak-js`, OIDC + PKCE).

## Getting started

```bash
# from the repository root
yarn install
yarn dev:superadmin
```

The dev server listens on **http://localhost:8100**.

Copy `.env.example` to `.env` and set the Keycloak/API values:

```
NUXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
NUXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NUXT_PUBLIC_KEYCLOAK_REALM=travelnest
NUXT_PUBLIC_KEYCLOAK_CLIENT_ID=travelnest-superadmin
NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI=http://localhost:8100/silent-check-sso.html
```

## Access control

- The app is gated to platform staff: a Keycloak user whose global roles include
  `admin` or `support_agent`. Everyone else is sent to `/403`.
- Every API call goes to `/api/v1/superadmin/*` and is authorized server-side by
  granular `platform.*` permissions. `support_agent` is read-only and sees masked
  user PII; `admin` may unmask via `platform.user.pii_read`.
- Session bootstrap uses `GET /api/v1/superadmin/me`.

## Keycloak setup (required)

Create a public client `travelnest-superadmin` in the realm with:

- Standard flow + PKCE (`S256`)
- Valid redirect URIs: `http://localhost:8100/*` (dev) and the production host
- Web origins: the same origins

## Commands

```bash
yarn workspace @travelnest/superadmin-client dev
yarn workspace @travelnest/superadmin-client build
yarn workspace @travelnest/superadmin-client typecheck
yarn workspace @travelnest/superadmin-client test:unit
yarn workspace @travelnest/superadmin-client test:e2e
```

## Deploy notes (TODO)

- Add `.github/workflows/superadmin-client.yml` (mirror `admin-client.yml`).
- Add k8s manifests + Argo CD app, and a DNS entry (e.g.
  `superadmin.deployserver.work`).
- Provision the Keycloak client and redirect URIs.
