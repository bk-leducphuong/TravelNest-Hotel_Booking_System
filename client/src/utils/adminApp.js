// Host/partner app that the guest app links out to (e.g. the "Bắt đầu ngay"
// CTA on /join, the Keycloak-hosted login). Configured per environment via
// VITE_ADMIN_HOST — see client/.env.format and the frontend CI build args.
const DEV_ADMIN_HOST = 'http://localhost:8000'

const configuredAdminHost = (import.meta.env.VITE_ADMIN_HOST || '').replace(/\/$/, '')

// Only fall back to localhost during local development. A production build
// missing VITE_ADMIN_HOST must not silently point users at localhost.
const ADMIN_HOST = configuredAdminHost || (import.meta.env.DEV ? DEV_ADMIN_HOST : '')

if (!ADMIN_HOST) {
  // Surface the misconfiguration instead of shipping a broken link.
  console.error(
    '[adminApp] VITE_ADMIN_HOST is not set; host-app links will fall back to a relative path.'
  )
}

export function adminAppUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${ADMIN_HOST}${normalized}`
}

export function goToAdminApp(path = '/') {
  window.location.href = adminAppUrl(path)
}
