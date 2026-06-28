import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/server/auth';

/**
 * POST /api/products/:id/duplicate
 *
 * Creates a fresh draft copy of a product (with its design configuration /
 * layers) owned by the same creator. Channel listings are intentionally not
 * copied — the duplicate starts as an unlisted draft.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let supabase, creator;
  try {
    ({ supabase, creator } = await requireCreator());
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: src, error: srcErr } = await supabase
    .from('sellable_product_instances')
    .select('*')
    .eq('id', id)
    .eq('creator_id', creator.id)
    .single();
  if (srcErr || !src) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Copy all columns except identity/timestamps; reset to a draft.
  const insertRow = { ...src } as Record<string, unknown>;
  delete insertRow.id;
  delete insertRow.created_at;
  delete insertRow.updated_at;
  insertRow.title = `${src.title || 'Untitled'} (Copy)`;
  insertRow.status = 'draft';

  const { data: copy, error: insErr } = await supabase
    .from('sellable_product_instances')
    .insert(insertRow)
    .select('id')
    .single();
  if (insErr || !copy) {
    return NextResponse.json({ error: insErr?.message || 'Failed to duplicate' }, { status: 500 });
  }

  // Copy the design configuration (layers) so the copy is editable too.
  const { data: cfg } = await supabase
    .from('product_configurations')
    .select('design_version_id, product_template_id, layers, print_area_snapshot, design_metadata')
    .eq('sellable_product_instance_id', id)
    .maybeSingle();
  if (cfg) {
    await supabase
      .from('product_configurations')
      .insert({ ...cfg, sellable_product_instance_id: copy.id });
  }

  return NextResponse.json({ id: copy.id });
}
