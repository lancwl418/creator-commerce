'use client';

import { createContext, useContext } from 'react';
import type { EditorConfig } from '@/types/editor-config';

const defaultConfig: EditorConfig = { mode: 'demo' };

const EditorConfigContext = createContext<EditorConfig>(defaultConfig);

export function useEditorConfig() {
  return useContext(EditorConfigContext);
}

export { EditorConfigContext };
