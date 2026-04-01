import { io } from 'socket.io-client';

const logger = {
  info: (...args) => console.log('[Socket.io]', ...args),
  warn: (...args) => console.warn('[Socket.io]', ...args),
  error: (...args) => console.error('[Socket.io]', ...args),
};

class SocketService {
  constructor() {
    this.sockets = {};
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(namespace = '/user', isAuthenticated = true) {
    if (this.sockets[namespace]?.connected) {
      logger.info(`Already connected to ${namespace} namespace`);
      return this.sockets[namespace];
    }

    this.isAuthenticated = isAuthenticated;

    const socketOptions = {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      withCredentials: true,
      autoConnect: true,
    };

    const serverUrl = import.meta.env.VITE_SOCKET_URL;
    const socket = io(`${serverUrl}${namespace}`, socketOptions);

    this.setupSocketListeners(socket, namespace);

    this.sockets[namespace] = socket;

    return socket;
  }

  setupSocketListeners(socket, namespace) {
    socket.on('connect', () => {
      this.reconnectAttempts = 0;
      logger.info(`Connected to ${namespace} namespace`, {
        socketId: socket.id,
        namespace,
      });
      socket.emit('ping', { timestamp: Date.now() });
    });

    socket.on('connected', (data) => {
      logger.info(`Welcome message from ${namespace}:`, data);
    });

    socket.on('disconnect', (reason) => {
      logger.warn(`Disconnected from ${namespace} namespace`, {
        reason,
        namespace,
      });
    });

    socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      logger.error(`Connection error to ${namespace}:`, {
        error: error.message,
        attempts: this.reconnectAttempts,
      });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error(`Max reconnection attempts reached for ${namespace}`);
        this.disconnect(namespace);
      }
    });

    socket.on('error', (error) => {
      logger.error(`Socket error in ${namespace}:`, error);
    });

    socket.on('session:terminated', (data) => {
      logger.warn(`Session terminated in ${namespace}:`, data.reason);
      this.disconnect(namespace);
    });

    socket.io.on('reconnect', (attemptNumber) => {
      logger.info(`Reconnected to ${namespace} after ${attemptNumber} attempts`);
    });

    socket.io.on('reconnect_attempt', (attemptNumber) => {
      logger.info(`Attempting to reconnect to ${namespace}... (${attemptNumber})`);
    });

    socket.io.on('reconnect_error', (error) => {
      logger.error(`Reconnection error to ${namespace}:`, error.message);
    });

    socket.io.on('reconnect_failed', () => {
      logger.error(`Failed to reconnect to ${namespace} after all attempts`);
    });
  }

  disconnect(namespace = '/user') {
    if (this.sockets[namespace]) {
      this.sockets[namespace].disconnect();
      delete this.sockets[namespace];
      logger.info(`Disconnected from ${namespace} namespace`);
    }
  }

  disconnectAll() {
    Object.keys(this.sockets).forEach((namespace) => {
      this.disconnect(namespace);
    });
    logger.info('Disconnected from all namespaces');
  }

  getSocket(namespace = '/user') {
    return this.sockets[namespace];
  }

  isConnected(namespace = '/user') {
    return this.sockets[namespace]?.connected || false;
  }

  on(event, callback, namespace = '/user') {
    const socket = this.getSocket(namespace);
    if (socket) {
      socket.on(event, callback);
    } else {
      logger.warn(`Cannot listen to ${event}: not connected to ${namespace}`);
    }
  }

  off(event, callback, namespace = '/user') {
    const socket = this.getSocket(namespace);
    if (socket) {
      socket.off(event, callback);
    }
  }

  emit(event, data, callback, namespace = '/user') {
    const socket = this.getSocket(namespace);
    if (socket && socket.connected) {
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
    } else {
      logger.warn(`Cannot emit ${event}: not connected to ${namespace}`);
    }
  }

  subscribeToBooking(bookingId, callback) {
    this.emit('bookings:subscribe', bookingId, callback);
  }

  unsubscribeFromBooking(bookingId, callback) {
    this.emit('bookings:unsubscribe', bookingId, callback);
  }

  onNotification(callback) {
    this.on('notification:new', callback);
  }

  offNotification(callback) {
    this.off('notification:new', callback);
  }

  onBookingUpdate(callback) {
    this.on('booking:updated', callback);
  }

  offBookingUpdate(callback) {
    this.off('booking:updated', callback);
  }
}

export default new SocketService();
