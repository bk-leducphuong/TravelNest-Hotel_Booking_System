import Keycloak from 'keycloak-js'

const DEFAULT_MIN_VALIDITY_SECONDS = 30
const REDIRECT_STORAGE_KEY = 'travelnest.auth.redirect'
const DEFAULT_SCOPE = 'openid'

let keycloak
let initPromise

function buildConfig() {
  const url = import.meta.env.VITE_KEYCLOAK_URL
  const realm = import.meta.env.VITE_KEYCLOAK_REALM
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID

  if (!url || !realm || !clientId) {
    throw new Error(
      'Missing Keycloak configuration. Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, and VITE_KEYCLOAK_CLIENT_ID.'
    )
  }

  return { url, realm, clientId }
}

function ensureClient() {
  if (!keycloak) {
    keycloak = new Keycloak(buildConfig())
  }

  return keycloak
}

function currentUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`
}

function absoluteRedirectUri(path) {
  if (!path) {
    return `${window.location.origin}/`
  }

  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

function silentRedirectUri() {
  return (
    import.meta.env.VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI ||
    `${window.location.origin}/silent-check-sso.html`
  )
}

function logoutRedirectUri() {
  return import.meta.env.VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI || `${window.location.origin}/`
}

function normalizedRoles(parsedToken) {
  const realmRoles = parsedToken?.realm_access?.roles || []
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID
  const clientRoles = clientId ? parsedToken?.resource_access?.[clientId]?.roles || [] : []

  return Array.from(new Set([...realmRoles, ...clientRoles]))
}

function combinedParsedToken(client) {
  const accessTokenClaims = client.tokenParsed || null
  const idTokenClaims = client.idTokenParsed || null

  if (!accessTokenClaims && !idTokenClaims) {
    return null
  }

  return {
    ...(accessTokenClaims || {}),
    ...(idTokenClaims || {}),
    realm_access: accessTokenClaims?.realm_access || idTokenClaims?.realm_access,
    resource_access: accessTokenClaims?.resource_access || idTokenClaims?.resource_access,
  }
}

function storeRedirectPath(path) {
  if (path) {
    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, path)
  }
}

export function consumeRedirectPath() {
  const path = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)
  if (path) {
    window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
  }
  return path
}

export async function initializeKeycloak() {
  if (!initPromise) {
    const client = ensureClient()
    initPromise = client.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      scope: DEFAULT_SCOPE,
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: silentRedirectUri(),
    })
  }

  return initPromise
}

export function isAuthenticated() {
  return Boolean(keycloak?.authenticated)
}

export async function getAccessToken(minValidity = DEFAULT_MIN_VALIDITY_SECONDS) {
  const client = ensureClient()

  if (!client.authenticated) {
    return null
  }

  await client.updateToken(minValidity)
  return client.token || null
}

export function getClaims() {
  const client = ensureClient()
  const parsedToken = combinedParsedToken(client)

  if (!parsedToken) {
    return null
  }

  return {
    subject: parsedToken.sub || '',
    email: parsedToken.email || '',
    preferredUsername: parsedToken.preferred_username || '',
    roles: normalizedRoles(parsedToken),
    tokenParsed: parsedToken,
  }
}

export async function login({ redirectPath, idpHint } = {}) {
  storeRedirectPath(redirectPath)
  return ensureClient().login({
    redirectUri: absoluteRedirectUri(redirectPath || currentUrl()),
    scope: DEFAULT_SCOPE,
    idpHint,
  })
}

export async function register({ redirectPath } = {}) {
  storeRedirectPath(redirectPath)
  return ensureClient().register({
    redirectUri: absoluteRedirectUri(redirectPath || currentUrl()),
    scope: DEFAULT_SCOPE,
  })
}

export async function logout() {
  return ensureClient().logout({
    redirectUri: logoutRedirectUri(),
  })
}

export async function openAccountManagement() {
  return ensureClient().accountManagement()
}

export async function resetPassword({ redirectPath } = {}) {
  storeRedirectPath(redirectPath)
  return ensureClient().login({
    redirectUri: absoluteRedirectUri(redirectPath || currentUrl()),
    scope: DEFAULT_SCOPE,
  })
}
