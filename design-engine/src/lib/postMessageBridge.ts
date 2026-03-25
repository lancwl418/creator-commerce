import type { ParentMessage, ChildMessage } from '@/types/postmessage';

type MessageHandler<T extends ParentMessage['type']> = (
  payload: Extract<ParentMessage, { type: T }>['payload']
) => void;

/**
 * Framework-agnostic postMessage bridge for iframe ↔ host communication.
 *
 * The editor (running in an iframe) uses this to:
 * - Receive commands from the host page (init, request-export)
 * - Send events back to the host page (ready, export-result, etc.)
 */
export class PostMessageBridge {
  private allowedOrigins: string[] = [];
  private handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  private listener: ((e: MessageEvent) => void) | null = null;

  /** Initialize the bridge and start listening for messages. */
  init(allowedOrigins: string[]): void {
    this.allowedOrigins = allowedOrigins;

    this.listener = (e: MessageEvent) => {
      // Validate origin
      if (this.allowedOrigins.length > 0 && !this.allowedOrigins.includes(e.origin)) {
        return;
      }

      const data = e.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
        return;
      }

      // Only handle ideamizer: prefixed messages
      if (!data.type.startsWith('ideamizer:')) {
        return;
      }

      const fns = this.handlers.get(data.type);
      if (fns) {
        for (const fn of fns) {
          try {
            fn(data.payload);
          } catch (err) {
            console.error(`[PostMessageBridge] handler error for ${data.type}:`, err);
          }
        }
      }
    };

    window.addEventListener('message', this.listener);
  }

  /** Register a handler for a specific message type. Returns an unsubscribe function. */
  onMessage<T extends ParentMessage['type']>(type: T, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    set.add(handler as (...args: unknown[]) => void);

    return () => {
      set.delete(handler as (...args: unknown[]) => void);
      if (set.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /** Send a message to the parent (host) page. */
  sendToParent(msg: ChildMessage): void {
    if (window.parent === window) {
      // Not in an iframe — no-op
      return;
    }
    // Use '*' target origin; the host decides what to accept.
    // We could restrict this to a known origin, but the host URL
    // may not always be known at build time.
    window.parent.postMessage(msg, '*');
  }

  /** Remove the message listener and clear all handlers. */
  destroy(): void {
    if (this.listener) {
      window.removeEventListener('message', this.listener);
      this.listener = null;
    }
    this.handlers.clear();
  }
}
