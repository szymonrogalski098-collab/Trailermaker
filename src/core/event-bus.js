/**
 * Minimal pub/sub EventBus used for cross-module state-change notifications
 * (e.g. TIMELINE_UPDATED, PROJECT_CHANGED). Request/response operations that
 * need a return value should use direct function calls (Promises) instead —
 * see docs/architecture.md for the full rationale.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<(payload: any) => void>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribes to an event.
   * @param {string} eventName one of the constants from core/events.js
   * @param {(payload: any) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Emits an event to all subscribers.
   * @param {string} eventName
   * @param {any} [payload]
   */
  emit(eventName, payload) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /**
   * Unsubscribes a handler from an event.
   * @param {string} eventName
   * @param {(payload: any) => void} handler
   */
  off(eventName, handler) {
    this.listeners.get(eventName)?.delete(handler);
  }
}

/** App-wide singleton EventBus instance. */
export const eventBus = new EventBus();
