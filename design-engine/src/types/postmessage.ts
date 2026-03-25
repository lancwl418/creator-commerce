import type { ProductTemplate } from '@/types/product';

// ── Parent (host page) → Iframe (Ideamizer editor) ──────────────

export interface InitMessage {
  type: 'ideamizer:init';
  payload: {
    template: ProductTemplate;
    /** Optional: restore a previously saved design */
    designJson?: string;
    /** Arbitrary metadata round-tripped back in export-result */
    metadata?: Record<string, string>;
  };
}

export interface RequestExportMessage {
  type: 'ideamizer:request-export';
  payload: {
    format: 'png' | 'json' | 'both';
  };
}

export type ParentMessage = InitMessage | RequestExportMessage;

// ── Iframe (Ideamizer editor) → Parent (host page) ──────────────

export interface ReadyMessage {
  type: 'ideamizer:ready';
}

export interface ExportResultMessage {
  type: 'ideamizer:export-result';
  payload: {
    designJson: string;
    pngDataUrl?: string;
    /** Echoed back from the init message */
    metadata?: Record<string, string>;
  };
}

export interface DesignChangedMessage {
  type: 'ideamizer:design-changed';
  payload: {
    hasLayers: boolean;
  };
}

export interface ErrorMessage {
  type: 'ideamizer:error';
  payload: {
    message: string;
  };
}

export type ChildMessage =
  | ReadyMessage
  | ExportResultMessage
  | DesignChangedMessage
  | ErrorMessage;

// ── Union of all messages ────────────────────────────────────────

export type IdeamizerMessage = ParentMessage | ChildMessage;
