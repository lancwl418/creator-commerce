import { createClient } from '@/lib/supabase/client';
import type { DesignUploadInput, PromotionPricingMode } from '@/lib/types/design';

export async function requestDesignPromotion(designId: string, mode: PromotionPricingMode, expectedProfit: string): Promise<void> {
  const update: Record<string, unknown> = { status: 'pending_review', updated_at: new Date().toISOString() };
  if (mode === 'custom') {
    const profit = expectedProfit.trim() === '' ? NaN : Number(expectedProfit);
    if (!Number.isFinite(profit) || profit < 0) throw new Error('Please enter a valid expected profit');
    update.creator_expected_price = profit;
  }
  const { error } = await createClient().from('designs').update(update).eq('id', designId);
  if (error) throw new Error(error.message);
}

export async function createDesign(creatorId: string, input: DesignUploadInput): Promise<string> {
  const db = createClient();
  const { file, title, description, tags, dimensions } = input;
  const ext = file.name.split('.').pop();
  const filePath = `${creatorId}/artworks/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await db.storage.from('design-assets').upload(filePath, file);
  if (uploadError) throw new Error(uploadError.message);
  const { data: urlData } = db.storage.from('design-assets').getPublicUrl(filePath);
  const { data: design, error: designError } = await db.from('designs')
    .insert({ creator_id: creatorId, title, description, status: 'draft' }).select().single();
  if (designError) throw new Error(designError.message);
  const { data: version, error: versionError } = await db.from('design_versions')
    .insert({ design_id: design.id, version_number: 1 }).select().single();
  if (versionError) throw new Error(versionError.message);
  const { error: assetError } = await db.from('design_assets').insert({
    design_version_id: version.id, asset_type: 'artwork', file_url: urlData.publicUrl,
    file_name: file.name, file_size: file.size, mime_type: file.type, width_px: dimensions.width, height_px: dimensions.height,
  });
  if (assetError) throw new Error(assetError.message);
  const { error: linkError } = await db.from('designs').update({ current_version_id: version.id }).eq('id', design.id);
  if (linkError) throw new Error(linkError.message);
  const tagList = [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
  if (tagList.length) {
    const { error } = await db.from('design_tags').insert(tagList.map(tag => ({ design_id: design.id, tag })));
    if (error) throw new Error(error.message);
  }
  return design.id;
}
