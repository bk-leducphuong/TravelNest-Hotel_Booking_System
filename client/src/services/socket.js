// src/services/socket.js
import { io } from 'socket.io-client'
import { getAccessToken } from './keycloak.service'

const API_PREFIX = '/api/v1'
const configuredHost = (import.meta.env.VITE_SERVER_HOST || '').replace(/\/$/, '')
const socketHost = configuredHost.endsWith(API_PREFIX) // socketHost: http://localhost:3000
  ? configuredHost.slice(0, -API_PREFIX.length)
  : configuredHost

const socket = io(socketHost, {
  autoConnect: false,
  withCredentials: false,
  transports: ['websocket', 'polling']
})

export async function connectSocket() {
  const token = await getAccessToken().catch(() => null)
  socket.auth = {
    ...(socket.auth || {}),
    token
  }

  if (!socket.connected) {
    socket.connect()
  }

  return socket
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

export default socket

socket.on('connect', () => {
  console.log('connected')
})

socket.on('disconnect', () => {
  console.log('disconnected')
})

socket.on('connect_error', (error) => {
  console.error('socket connection failed:', error.message)
})
