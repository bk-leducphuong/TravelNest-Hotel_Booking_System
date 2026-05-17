import axios from 'axios'

const serverOrigin = (import.meta.env.VITE_SERVER_HOST || '')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')

const health = axios.create({
  baseURL: serverOrigin,
  timeout: 10000,
  withCredentials: true
})

health.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export const HealthService = {
  getHealth() {
    return health.get('/health')
  },

  getLiveness() {
    return health.get('/health/live')
  },

  getReadiness() {
    return health.get('/health/ready')
  }
}
