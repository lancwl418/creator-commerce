import { createClient } from '@/lib/supabase/server';

export async function getDesigns(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('designs')
    .select(`
      id, title, status, created_at,
      design_versions!design_versions_design_id_fkey (
        id, version_number,
        design_assets (id, asset_type, file_url)
      )
    `)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  return data || [];
}
