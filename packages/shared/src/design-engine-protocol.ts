/**
 * Design Engine ⇄ host postMessage contract.
 *
 * The Design Engine is an embeddable editor: a host (Creator Portal today,
 * Shopify app or other platforms tomorrow) embeds it in an iframe, hands it
 * product templates, and receives the finished design back. The editor stays
 * host-agnostic — it never knows about ERP, Shopify, or any host's domain.
 *
 * Both directions are namespaced and carry an opaque `context` the host can
 * use to correlate the result with its own records (design id, store id, …).
 */

/** Message type identifiers (use these constants, never raw strings). */
export const DESIGN_EDITOR_MESSAGE = {
  /** editor → host: editor mounted and ready to receive commands */
  READY: 'DESIGN_EDITOR_READY',
  /** editor → host: user saved; payload carries the design output */
  SAVED: 'DESIGN_EDITOR_SAVED',
  /** editor → host: a fatal error occurred */
  ERROR: 'DESIGN_EDITOR_ERROR',
  /** host → editor: load a previously saved design for editing */
  LOAD_DESIGN: 'DESIGN_EDITOR_LOAD_DESIGN',
} as const;

export type DesignEditorMessageType =
  (typeof DESIGN_EDITOR_MESSAGE)[keyof typeof DESIGN_EDITOR_MESSAGE];

/** A single image/text/shape layer (kept loose so the editor owns the detail). */
export interface DesignLayerLike {
  type: string;
  data?: { src?: string } & Record<string, unknown>;
  [key: string]: unknown;
}

/** One product as produced by the editor on save. */
export interface DesignEditorProduct {
  template_id: string;
  name?: string;
  description?: string;
  base_cost?: number;
  thumbnail?: string | null;
  layers?: DesignLayerLike[];
  artwork_urls?: string[];
  product_images?: unknown[];
  print_area_snapshot?: unknown;
  design_metadata?: unknown;
  variant_previews?: Record<string, string> | null;
}

/** The save payload (one or more products + the design they came from). */
export interface DesignEditorPayload {
  design_id?: string | null;
  products: DesignEditorProduct[];
  title_prefix?: string;
}

// ── editor → host messages ──

export interface DesignEditorReadyMessage {
  type: typeof DESIGN_EDITOR_MESSAGE.READY;
  context?: unknown;
}

export interface DesignEditorSavedMessage {
  type: typeof DESIGN_EDITOR_MESSAGE.SAVED;
  payload: DesignEditorPayload;
  /** Opaque value the host passed in; echoed back untouched. */
  context?: unknown;
}

export interface DesignEditorErrorMessage {
  type: typeof DESIGN_EDITOR_MESSAGE.ERROR;
  error: string;
  context?: unknown;
}

export type DesignEditorOutboundMessage =
  | DesignEditorReadyMessage
  | DesignEditorSavedMessage
  | DesignEditorErrorMessage;

// ── host → editor messages ──

export interface LoadDesignMessage {
  type: typeof DESIGN_EDITOR_MESSAGE.LOAD_DESIGN;
  /** A serialized DesignDocument (editor-owned shape) to restore. */
  design: unknown;
  context?: unknown;
}

export type DesignEditorInboundMessage = LoadDesignMessage;

/** Narrowing helper for host listeners. */
export function isDesignEditorMessage(
  data: unknown,
): data is DesignEditorOutboundMessage {
  if (!data || typeof data !== 'object') return false;
  const t = (data as { type?: unknown }).type;
  return (
    t === DESIGN_EDITOR_MESSAGE.READY ||
    t === DESIGN_EDITOR_MESSAGE.SAVED ||
    t === DESIGN_EDITOR_MESSAGE.ERROR
  );
}
