import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/products/save-from-editor
 *
 * Called by Design Engine after designer saves their work.
 * Creates sellable_product_instances + product_configurations in the database.
 *
 * Body: {
 *   design_id: string,
 *   products: Array<{
 *     template_id: string,
 *     name: string,
 *     base_cost: number,
 *     thumbnail: string | null,
 *     layers: object[],  // design layers for this product
 *   }>,
 *   title_prefix: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = await request.json();
    const { design_id, products, title_prefix } = body;

    if (!design_id || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the current design version
    const { data: design } = await supabase
      .from('designs')
      .select('id, current_version_id')
      .eq('id', design_id)
      .single();

    if (!design?.current_version_id) {
      return NextResponse.json({ error: 'Design or version not found' }, { status: 404 });
    }

    const createdIds: string[] = [];

    for (const product of products) {
      const productTitle = products.length > 1
        ? `${title_prefix} — ${product.name}`
        : title_prefix || product.name;

      // Create sellable_product_instance
      const { data: instance, error: instanceError } = await supabase
        .from('sellable_product_instances')
        .insert({
          creator_id: creator.id,
          design_id: design.id,
          design_version_id: design.current_version_id,
          product_template_id: product.template_id,
          title: productTitle,
          status: 'draft',
          base_price_suggestion: product.base_cost ? product.base_cost * 2.5 : null,
          preview_urls: product.thumbnail ? [product.thumbnail] : [],
        })
        .select('id')
        .single();

      if (instanceError) {
        console.error('Failed to create product instance:', instanceError);
        continue;
      }

      createdIds.push(instance.id);

      // Create product_configuration with saved layers
      await supabase
        .from('product_configurations')
        .insert({
          sellable_product_instance_id: instance.id,
          design_version_id: design.current_version_id,
          product_template_id: product.template_id,
          layers: product.layers || [],
        });
    }

    return NextResponse.json({
      success: true,
      created: createdIds.length,
      ids: createdIds,
    });
  } catch (err) {
    console.error('save-from-editor error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
