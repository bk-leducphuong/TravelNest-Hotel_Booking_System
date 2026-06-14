import { io } from 'socket.io-client'
import { getAccessToken } from './keycloak.service'

const API_PREFIX = '/api/v1'
const configuredHost = (import.meta.env.VITE_SERVER_HOST || '').replace(/\/$/, '')
const socketHost = configuredHost.endsWith(API_PREFIX)
  ? configuredHost.slice(0, -API_PREFIX.length)
  : configuredHost

let userSocket

export async function getUserSocket() {
  const token = await getAccessToken().catch(() => null)

  if (!userSocket) {
    userSocket = io(`${socketHost}/user`, {
      withCredentials: false,
      transports: ['websocket', 'polling'],
      auth: { token }
    })

    userSocket.on('connect', () => {
      console.log('[userSocket] connected', {
        id: userSocket.id,
        namespace: '/user'
      })
    })

    userSocket.on('disconnect', (reason) => {
      console.log('[userSocket] disconnected', { reason })
    })

    userSocket.on('connect_error', (error) => {
      console.error('[userSocket] connection failed:', error.message)
    })

    userSocket.on('connected', (payload) => {
      console.log('[userSocket] namespace handshake received', payload)
    })
  } else {
    userSocket.auth = {
      ...(userSocket.auth || {}),
      token
    }

    if (!userSocket.connected) {
      userSocket.connect()
    }
  }

  return userSocket
}

export function closeUserSocket() {
  if (userSocket) {
    userSocket.disconnect()
    userSocket = null
  }
}
