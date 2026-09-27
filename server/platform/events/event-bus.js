const { EventEmitter } = require('events');

const logger = require('@config/logger.config');

/**
 * In-process domain event bus.
 *
 * This is intentionally thin: modules publish domain events and other modules
 * subscribe without importing each other's internals. Today the transport is
 * in-process; it can be swapped for NATS later without changing callers.
 *
 * Handlers are awaited but isolated - a failing subscriber is logged and never
 * breaks the publisher's request.
 */
class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  subscribe(eventName, handler) {
    this.emitter.on(eventName, handler);
    return () => this.emitter.off(eventName, handler);
  }

  async publish(eventName, payload = {}) {
    const listeners = this.emitter.listeners(eventName);

    if (listeners.length === 0) {
      logger.debug({ eventName }, 'Domain event published with no subscribers');
      return [];
    }

    const results = await Promise.all(
      listeners.map(async (listener) => {
        try {
          return await listener(payload, eventName);
        } catch (error) {
          logger.error(
            { error: error.message, eventName, payload },
            'Domain event subscriber failed'
          );
          return null;
        }
      })
    );

    return results;
  }
}

module.exports = new EventBus();
