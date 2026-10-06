'use client';

import { useDesignEditor } from '@/hooks/products/useDesignEditor';
import DesignEditorFrame from '@/components/products/editor/DesignEditorFrame';

interface EditDesignWizardProps {
  productId: string;
  templateId: string;
  layers: unknown[];
}

export default function EditDesignWizard(props: EditDesignWizardProps) {
  const editor = useDesignEditor({ mode: 'edit', ...props });
  return <DesignEditorFrame {...editor} backHref={`/dashboard/products/${props.productId}`} busyMessage="Saving your design…" />;
}
