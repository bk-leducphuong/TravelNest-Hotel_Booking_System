const ADMIN_HOST = (import.meta.env.VITE_ADMIN_HOST || 'http://localhost:8000').replace(/\/$/, '')

export function adminAppUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${ADMIN_HOST}${normalized}`
}

export function goToAdminApp(path = '/') {
  window.location.href = adminAppUrl(path)
}
