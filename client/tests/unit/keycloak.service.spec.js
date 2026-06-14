import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logoutMock = vi.fn()

class KeycloakMock {
  constructor() {
    return {
      init: vi.fn(),
      login: vi.fn(),
      logout: logoutMock,
      register: vi.fn(),
      accountManagement: vi.fn(),
      updateToken: vi.fn(),
      authenticated: false,
      token: null,
      tokenParsed: null,
      idTokenParsed: null,
    }
  }
}

vi.mock('keycloak-js', () => ({
  default: KeycloakMock,
}))

async function loadService() {
  vi.resetModules()
  return import('@/services/keycloak.service')
}

describe('keycloak logout redirect', () => {
  beforeEach(() => {
    logoutMock.mockReset()
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_KEYCLOAK_REALM', 'travelnest')
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'travelnest-web')
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults post logout redirect to /login on the current origin', async () => {
    const service = await loadService()

    await service.logout()

    expect(logoutMock).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:3000/login',
    })
  })

  it('supports relative post logout redirect overrides', async () => {
    vi.stubEnv('VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI', '/signed-out')
    const service = await loadService()

    await service.logout()

    expect(logoutMock).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:3000/signed-out',
    })
  })

  it('preserves absolute post logout redirect overrides', async () => {
    vi.stubEnv('VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/logout-complete')
    const service = await loadService()

    await service.logout()

    expect(logoutMock).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:5173/logout-complete',
    })
  })
})
