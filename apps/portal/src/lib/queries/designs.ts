import { createClient } from '@/lib/supabase/server';

export async function getDesigns(creatorId: string, statusFilter?: string[]) {
  const supabase = await createClient();
  let query = supabase
    .from('designs')
    .select(`
      id, title, status, current_version_id, created_at,
      design_versions!design_versions_design_id_fkey (
        id, version_number,
        design_assets (id, asset_type, file_url)
      )
    `)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter);
  }

  const { data } = await query;

  return data || [];
}

export async function getDesignById(designId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('designs')
    .select(`
      *,
      design_versions!design_versions_design_id_fkey (
        id,
        version_number,
        changelog,
        created_at,
        design_assets (
          id,
          asset_type,
          file_url,
          file_name,
          file_size,
          mime_type,
          width_px,
          height_px,
          dpi
        )
      ),
      design_tags (
        id,
        tag
      )
    `)
    .eq('id', designId)
    .single();

  return data;
}
