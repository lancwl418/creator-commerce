import { redirect, notFound } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import EditDesignWizard from './EditDesignWizard';

export default async function EditDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let creator, supabase;
  try {
    ({ creator, supabase } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const { id } = await params;

  const { data: product } = await supabase
    .from('sellable_product_instances')
    .select('id, product_template_id, design_id')
    .eq('id', id)
    .eq('creator_id', creator.id)
    .single();

  if (!product) notFound();

  const { data: config } = await supabase
    .from('product_configurations')
    .select('layers')
    .eq('sellable_product_instance_id', id)
    .maybeSingle();

  return (
    <EditDesignWizard
      productId={product.id}
      templateId={product.product_template_id}
      layers={(config?.layers as unknown[]) ?? []}
    />
  );
}
