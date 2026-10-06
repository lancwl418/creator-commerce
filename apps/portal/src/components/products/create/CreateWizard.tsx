'use client';

import { useDesignEditor } from '@/hooks/products/useDesignEditor';
import DesignEditorFrame from '@/components/products/editor/DesignEditorFrame';

interface CreateWizardProps {
  creatorId: string;
  templates: string;
  cacheKey: string;
}

export default function CreateWizard(props: CreateWizardProps) {
  const editor = useDesignEditor({ mode: 'create', ...props });
  return <DesignEditorFrame {...editor} backHref="/dashboard/catalog" busyMessage="Creating your product…" />;
}
