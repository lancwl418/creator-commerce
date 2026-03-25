'use client';

import { useEffect, useRef, useCallback } from 'react';
import { PostMessageBridge } from '@/lib/postMessageBridge';
import type { ProductTemplate } from '@/types/product';

interface PostMessageBridgeOptions {
  /** Allowed origins for incoming messages. Empty array = allow all (dev only). */
  allowedOrigins: string[];
  /** Called when host sends ideamizer:init with a product template. */
  onInit: (template: ProductTemplate, designJson?: string, metadata?: Record<string, string>) => void;
  /** Called when host requests an export. */
  onRequestExport: (format: 'png' | 'json' | 'both') => void;
}

interface PostMessageBridgeActions {
  /** Notify the host that the editor is ready to receive commands. */
  sendReady: () => void;
  /** Send export results back to the host. */
  sendExportResult: (designJson: string, pngDataUrl?: string, metadata?: Record<string, string>) => void;
  /** Notify the host that the design content has changed. */
  sendDesignChanged: (hasLayers: boolean) => void;
  /** Send an error message to the host. */
  sendError: (message: string) => void;
}

export function usePostMessageBridge(options: PostMessageBridgeOptions): PostMessageBridgeActions {
  const bridgeRef = useRef<PostMessageBridge | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const bridge = new PostMessageBridge();
    bridgeRef.current = bridge;

    bridge.init(optionsRef.current.allowedOrigins);

    const unsubs: (() => void)[] = [];

    unsubs.push(
      bridge.onMessage('ideamizer:init', (payload) => {
        optionsRef.current.onInit(payload.template, payload.designJson, payload.metadata);
      })
    );

    unsubs.push(
      bridge.onMessage('ideamizer:request-export', (payload) => {
        optionsRef.current.onRequestExport(payload.format);
      })
    );

    // Notify host that the editor is ready
    bridge.sendToParent({ type: 'ideamizer:ready' });

    return () => {
      unsubs.forEach((u) => u());
      bridge.destroy();
      bridgeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendReady = useCallback(() => {
    bridgeRef.current?.sendToParent({ type: 'ideamizer:ready' });
  }, []);

  const sendExportResult = useCallback(
    (designJson: string, pngDataUrl?: string, metadata?: Record<string, string>) => {
      bridgeRef.current?.sendToParent({
        type: 'ideamizer:export-result',
        payload: { designJson, pngDataUrl, metadata },
      });
    },
    []
  );

  const sendDesignChanged = useCallback((hasLayers: boolean) => {
    bridgeRef.current?.sendToParent({
      type: 'ideamizer:design-changed',
      payload: { hasLayers },
    });
  }, []);

  const sendError = useCallback((message: string) => {
    bridgeRef.current?.sendToParent({
      type: 'ideamizer:error',
      payload: { message },
    });
  }, []);

  return { sendReady, sendExportResult, sendDesignChanged, sendError };
}
