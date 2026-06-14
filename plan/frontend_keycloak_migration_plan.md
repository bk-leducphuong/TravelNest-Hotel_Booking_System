  # Frontend Keycloak Migration Plan

  ## Summary

  The backend migration is far enough along that the frontend should now treat Keycloak as the only identity provider and the Node API as a bearer-token resource server. The frontend
  must stop calling legacy auth endpoints for login, logout, registration, reset-password, email check, and social login. It should only call the backend for authenticated app data
  and for optional principal enrichment via GET /api/v1/auth/session.

  Two review findings affect the frontend plan immediately:

  - client/src/services/auth.service.js and the Vuex auth store still assume server-owned session auth and call endpoints that no longer exist.
  - server/routes/v1/auth.routes.js still references deprecatedAuthFlow, which is undefined in the file. That should be removed or replaced before relying on the route module.

  Defaults chosen for the plan:

  - Use hosted Keycloak pages for login, registration, social login, and password reset.
  - Use one Keycloak SPA client for both customer and admin flows, and distinguish access with token roles plus app-side hotel membership checks.
  - Use keycloak-js with Authorization Code + PKCE.

  ## Key Changes

  ### 1. Replace session auth with a Keycloak client layer

  - Add a dedicated client auth integration based on keycloak-js.
  - Initialize Keycloak once during app bootstrap with onLoad: 'check-sso' and silent SSO support.
  - Add a silent callback page such as /silent-check-sso.html.
  - Centralize token lifecycle:
      - init
      - login
      - logout
      - register
      - accountManagement
      - resetPassword
      - getValidToken
      - token refresh before expiry

  - Keep tokens in the Keycloak adapter runtime, not in Vuex, localStorage, or custom cookies.

  ### 2. Redesign the frontend auth store around identity state, not credential submission

  - Replace the current Vuex auth actions that post credentials to /auth/*.
  - New auth store responsibilities:
      - track isAuthenticated
      - track Keycloak profile basics from token claims
      - track app-enriched identity from /auth/session
      - expose derived flags for customer/admin access
      - clear sockets and app state on logout

  - Remove credential-oriented actions:
      - login
      - register
      - loginAdmin
      - checkEmail

  - Add identity-oriented actions:
      - initializeAuth
      - refreshAuthContext
      - startLogin
      - startAdminLogin
      - startRegister
      - startLogout
      - openAccountConsole
      - startResetPassword

  - Keep the backend compatibility call GET /auth/session, but only as a token-backed “who am I in the app domain” bootstrap. It should no longer be treated as a session creator.

  ### 3. Make all API and socket traffic bearer-token aware

  - Update the shared HTTP client to:
      - remove withCredentials as the auth default
      - inject Authorization: Bearer <access_token> on every API request
      - refresh the token before sending when needed
      - handle 401 by retrying after refresh once, then forcing re-login

  - Migrate components and services that still use raw axios plus hardcoded /api/auth/* URLs onto the shared token-aware client.
  - Update socket clients to pass the access token in handshake.auth.token instead of relying on cookies.
  - Reconnect sockets after login, refresh if needed, and disconnect them on logout.

  ### 4. Replace the login and reset UX with Keycloak entrypoints

  - Keep /login and /admin/login, but convert them into thin entry pages:
      - customer page starts keycloak.login()
      - admin page starts keycloak.login() with an admin-oriented redirect target
      - registration button starts keycloak.register()
      - forgot-password starts Keycloak reset flow or account console action

  - Remove password fields, email-check flow, local registration flow, and backend social-login redirects from the frontend.
  - Remove the current social buttons’ direct backend behavior. If social IdPs are configured in Keycloak, they appear on the hosted Keycloak login page instead.
  - Move partner-only onboarding data that is not identity-owned, such as phone OTP or business details, out of the login form and into a post-login onboarding flow in the app.

  ### 5. Rework route guards and app bootstrap

  - Replace “check auth by server session before every navigation” with:
      - one auth initialization during app startup
      - lightweight guards based on store state afterward

  - Auth bootstrap order:
      1. initialize Keycloak
      2. if authenticated, fetch /auth/session
      3. populate Vuex auth state
      4. open user/admin sockets if needed

  - Customer route guard should require authenticated user plus customer-capable app context.
  - Admin route guard should require authenticated user plus admin/partner token role or hotel-management context from /auth/session.
  - Preserve redirect-after-login by storing the original target route and passing it through the Keycloak round-trip.

  ### 6. Normalize app-owned user context after login

  - Treat the token as identity proof and /auth/session as app context resolution.
  - The frontend auth model should include:
      - Keycloak subject
      - email
      - token roles
      - local user.id
      - app user type
      - primary hotel context if present

  - Update components that read userId or role from the old session shape to read from the new normalized store state.
  - Keep customer/admin authorization split in the frontend as a display concern only. Backend authorization remains authoritative.

  ## Public Interfaces / Types

  - New frontend env vars:
      - VITE_KEYCLOAK_URL
      - VITE_KEYCLOAK_REALM
      - VITE_KEYCLOAK_CLIENT_ID
      - VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI
      - optional VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI

  - Shared auth service contract:
      - initializeAuth(): Promise<AuthState>
      - login(options?): Promise<void>
      - register(options?): Promise<void>
      - logout(options?): Promise<void>
      - resetPassword(): Promise<void>
      - getAccessToken(minValidity?): Promise<string | null>
      - refreshAuthContext(): Promise<AppAuthContext | null>

  - Vuex auth state should include:
      - isAuthenticated
      - subject
      - email
      - tokenRoles
      - userId
      - userType
      - hotelContext
      - authLoaded

  - Backend API usage change:
      - all protected requests require bearer tokens
      - /api/v1/auth/session is read-only auth inspection, not login/session creation

  ## Test Plan

  - Bootstrap
      - unauthenticated app load completes without errors
      - authenticated app load restores auth state and fetches /auth/session
      - silent SSO works after browser refresh

  - HTTP auth
      - protected API requests include bearer token
      - expired token refreshes automatically
      - refresh failure clears auth state and redirects to login

  - Route guards
      - customer-only routes redirect anonymous users to /login
      - admin-only routes redirect anonymous users to /admin/login
      - logged-in customer cannot enter admin routes without required roles/context
      - post-login redirect returns user to the originally requested route

  - Login UX
      - /login launches Keycloak hosted login
      - register launches Keycloak hosted registration
      - forgot-password launches Keycloak reset flow
      - social login is available from the hosted Keycloak page

  - App context
      - /auth/session populates local user.id and hotel context after login
      - favorites, notifications, recent searches, recently viewed hotels, and review submission continue working with bearer auth

  - Sockets
      - user socket connects only when authenticated
      - socket handshake includes token
      - socket disconnects on logout

  ## Assumptions

  - Keycloak is the only owner of credentials, password reset, registration, and social login.
  - The frontend will not keep collecting passwords locally.
  - One Keycloak SPA client serves both customer and admin login entrypoints.
  - Partner-specific onboarding fields remain app-owned and should move to a post-login onboarding flow rather than stay inside authentication.
  - The backend will keep GET /api/v1/auth/session as the app-context bootstrap endpoint during this migration.
