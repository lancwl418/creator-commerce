'use client';

import { useDesignStore } from '@/stores/designStore';

export function useHistory() {
  const store = useDesignStore;

  const undo = () => {
    store.temporal.getState().undo();
  };

  const redo = () => {
    store.temporal.getState().redo();
  };

  const canUndo = () => {
    return store.temporal.getState().pastStates.length > 0;
  };

  const canRedo = () => {
    return store.temporal.getState().futureStates.length > 0;
  };

  return { undo, redo, canUndo, canRedo };
}
