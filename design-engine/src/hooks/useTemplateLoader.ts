'use client';

import { useEffect, useRef } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useEditorConfig } from '@/components/editor/EditorConfigContext';
import { templateRegistry } from '@/core/templates/ProductTemplateRegistry';
import { validateTemplate, validateTemplates } from '@/core/templates/TemplateValidator';

/**
 * Loads templates into productStore based on EditorConfig mode.
 * Call once at the top of the editor component tree.
 */
export function useTemplateLoader() {
  const config = useEditorConfig();
  const status = useProductStore((s) => s.status);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const { setTemplates, setEmbeddedTemplate, setLoading, setError } =
      useProductStore.getState();

    switch (config.mode) {
      case 'demo': {
        setTemplates(templateRegistry.getAll());
        break;
      }

      case 'embedded': {
        if (!config.template) {
          setError('Embedded mode requires a template in EditorConfig');
          return;
        }
        const validated = validateTemplate(config.template);
        if (!validated) {
          setError('Invalid template provided to embedded editor');
          return;
        }
        setEmbeddedTemplate(validated);
        break;
      }

      case 'standalone': {
        if (!config.apiEndpoint) {
          setError('Standalone mode requires an apiEndpoint in EditorConfig');
          return;
        }
        setLoading();

        fetch(config.apiEndpoint, {
          headers: config.apiHeaders ?? {},
        })
          .then((res) => {
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            return res.json();
          })
          .then((data: unknown) => {
            const templates = validateTemplates(
              Array.isArray(data) ? data : []
            );
            if (templates.length === 0) {
              setError('No valid templates returned from API');
              return;
            }
            setTemplates(templates);
          })
          .catch((err: Error) => {
            setError(err.message);
          });
        break;
      }
    }
  }, [config]);

  return status;
}
