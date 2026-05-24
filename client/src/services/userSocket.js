import { io } from 'socket.io-client'

const API_PREFIX = '/api/v1'
const configuredHost = (import.meta.env.VITE_SERVER_HOST || '').replace(/\/$/, '')
const socketHost = configuredHost.endsWith(API_PREFIX)
  ? configuredHost.slice(0, -API_PREFIX.length)
  : configuredHost

let userSocket

export function getUserSocket() {
  if (!userSocket) {
    userSocket = io(`${socketHost}/user`, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })
  }

  return userSocket
}

export function closeUserSocket() {
  if (userSocket) {
    userSocket.disconnect()
    userSocket = null
  }
}
