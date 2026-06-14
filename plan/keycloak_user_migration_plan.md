  # Keycloak User Migration Plan

  ## Summary

  Bulk-migrate legacy auth identities from MySQL into Keycloak, then bind each app users row to the created Keycloak user by writing users.keycloak_user_id. The migration should use
  the Keycloak Admin API, not direct writes to the Keycloak DB.

  This repo currently stores legacy auth in:

  - users: profile and app-owned status/context
  - auth_accounts: credentials and old social-provider bindings
  - user_roles: global roles
  - hotel_users: hotel-scoped roles that remain app-owned

  Defaults chosen:

  - one-time bulk migration in test environment
  - import existing local bcrypt passwords where possible
  - if a password hash cannot be imported into Keycloak, create the user and force UPDATE_PASSWORD
  - social accounts are re-linked on first Keycloak login by email, not recreated as broker links during migration
  - Twitter/X should stay disabled at first cutover unless you verify that the provider returns trusted email

  ## Key Changes

  ### 1. Migration prerequisites

  - Keep the current travelnest realm and travelnest-web client.
  - In Keycloak, create realm roles user, admin, support_agent because the backend syncs only those managed roles.
  - Temporarily disable self-registration and social login until the import finishes, then re-enable them.
  - Configure Google broker with trusted email and existing-account linking by email.
  - Leave Twitter broker disabled for initial cutover unless the test setup guarantees verified email.

  ### 2. Migration data model and mapping

  - Source data:
      - users
      - auth_accounts
      - user_roles joined to roles

  - Target Keycloak user fields:
      - username: lowercase email
      - email: lowercase email
      - firstName / lastName: from users.first_name / users.last_name
      - enabled: users.status === 'active'
      - emailVerified: users.email_verified_at != null
      - attributes:
          - legacy_user_id
          - legacy_status
          - legacy_auth_providers
          - migration_batch

  - Target Keycloak roles:
      - map only user, admin, support_agent
      - do not migrate owner, manager, staff into Keycloak; they remain in app DB

  - Local DB binding:
      - write returned Keycloak user ID into users.keycloak_user_id
      - do not delete auth_accounts during the migration phase

  ### 3. Password and social migration behavior

  - For auth_accounts.provider='local':
      - read password_hash
      - create the Keycloak user with imported bcrypt credential if the Admin API accepts the credential payload
      - if Keycloak rejects the imported credential, still create the user, set requiredActions=['UPDATE_PASSWORD'], and record that user as password_reset_required

  - For auth_accounts.provider in ('google','twitter','facebook','apple'):
      - do not recreate broker-link records in Keycloak during v1
      - store the old providers as a Keycloak user attribute for audit only
      - rely on first Keycloak social login to link to the existing imported account by email

  - Users with no local password:
      - create the Keycloak user without password credential
      - set requiredActions=['UPDATE_PASSWORD']

  - Users with status in ('inactive','banned'):
      - create them disabled in Keycloak
      - keep local status unchanged so backend app authorization still matches existing behavior

  ### 4. Implementation shape

  - Add a dedicated migration CLI under server/scripts/keycloak/ with three commands:
      - audit-users.js: dry-run inventory and conflict report
      - migrate-users.js: bulk import into Keycloak and bind keycloak_user_id
      - verify-users.js: compare MySQL users vs Keycloak users after import

  - CLI flags:
      - --dry-run
      - --limit
      - --email
      - --resume
      - --batch-id

  - Required env/config:
      - KEYCLOAK_BASE_URL
      - KEYCLOAK_REALM
      - KEYCLOAK_ADMIN_CLIENT_ID
      - KEYCLOAK_ADMIN_CLIENT_SECRET or admin username/password
      - KEYCLOAK_ADMIN_USERNAME
      - KEYCLOAK_ADMIN_PASSWORD

  - audit-users.js must detect and fail on:
      - missing email
      - duplicate email
      - duplicate keycloak_user_id
      - multiple local auth rows for one user
      - users already existing in Keycloak with a conflicting email/subject

  - migrate-users.js must be idempotent:
      - skip users with valid keycloak_user_id already present in Keycloak
      - if DB has no keycloak_user_id but Keycloak already has the user by email, bind the existing Keycloak ID instead of creating a duplicate
      - assign realm roles after user creation/binding
      - update users.keycloak_user_id only after Keycloak creation/binding succeeds
      - emit a machine-readable report with created, bound_existing, skipped, failed, password_reset_required

  - verify-users.js must confirm:
      - imported counts match expected active/inactive totals
      - every migrated app user has a keycloak_user_id
      - every bound Keycloak user has expected email and managed roles

  ### 5. Cutover and cleanup

  - Run order:
      1. audit-users.js --dry-run
      2. resolve data conflicts
      3. migrate-users.js --batch-id=<timestamp>
      4. verify-users.js
      5. manually test login for local-password, admin, support-agent, Google-linked, and disabled-user cases
      6. re-enable registration and approved social providers

  - After successful migration:
      - backend remains unchanged in its current Keycloak flow
      - frontend continues authenticating directly against Keycloak
      - keep legacy auth_accounts as rollback/audit data until the system is stable

  - Deferred cleanup:
      - remove local-password mutation paths entirely
      - later archive or drop auth_accounts.password_hash once rollback is no longer needed

  ## Public Interfaces / Commands

  - New operational interface:
      - node server/scripts/keycloak/audit-users.js --dry-run
      - node server/scripts/keycloak/migrate-users.js --batch-id=...
      - node server/scripts/keycloak/verify-users.js

  - New report artifact format:
      - one JSON report per batch with user-level status and failure reason

  - No app-facing API changes are required for this migration; the existing backend already expects Keycloak bearer tokens and users.keycloak_user_id.

  ## Test Plan

  - Audit:
      - user with duplicate email is reported and blocks migration
      - user already bound to a missing Keycloak subject is reported

  - Migration:
      - active local-password user is created in Keycloak and can log in
      - local-password user whose hash import fails is created with UPDATE_PASSWORD
      - user with no local password is created with UPDATE_PASSWORD
      - existing Keycloak user by email is bound instead of duplicated
      - admin and support_agent roles are assigned in Keycloak and reflected by backend token auth
      - inactive/banned users are disabled in Keycloak
      - rerunning the migration does not create duplicates

  - Social:
      - imported Google user can log in through Keycloak and link to the existing app account by email
      - Twitter-linked legacy users are flagged if email-based linking is not available

  - Verification:
      - users.keycloak_user_id is populated for every migrated user
      - GET /api/v1/auth/session works after login for migrated users
      - hotel-scoped permissions still come from app DB and are unchanged

  ## Assumptions

  - This is a test environment with no real traffic, so a one-time bulk migration is sufficient.
  - Legacy local passwords are bcrypt hashes from auth_accounts.password_hash.
  - Keycloak remains the system of record for credentials after migration.
  - Realm travelnest and client travelnest-web already exist and are working.
  - Google can be linked by verified email; Twitter/X is excluded from seamless first-login migration unless its email behavior is proven in this environment.
