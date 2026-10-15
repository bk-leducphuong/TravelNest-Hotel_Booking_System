import { describe, it, expect, vi, afterEach } from 'vitest'

describe('utils/adminApp', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('builds admin URLs from VITE_ADMIN_HOST and normalises the path', async () => {
    vi.stubEnv('VITE_ADMIN_HOST', 'https://admin.example.com/')
    const { adminAppUrl } = await import('@/utils/adminApp')

    expect(adminAppUrl('/login')).toBe('https://admin.example.com/login')
    expect(adminAppUrl('login')).toBe('https://admin.example.com/login')
    expect(adminAppUrl()).toBe('https://admin.example.com/')
  })

  it('falls back to localhost only in a dev build when VITE_ADMIN_HOST is missing', async () => {
    vi.stubEnv('VITE_ADMIN_HOST', '')
    const { adminAppUrl } = await import('@/utils/adminApp')

    expect(adminAppUrl('/login')).toBe('http://localhost:8000/login')
  })
})
