-- ============================================================
-- Supabase Storage: 文件存储桶
-- ============================================================

-- design-assets 桶：存放 artwork、preview、source file
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-assets', 'design-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: creator 只能上传到自己的目录 (/{creator_id}/...)
CREATE POLICY "design_assets_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'design-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT id::text FROM creators WHERE auth_user_id = auth.uid()
        )
    );

-- creator 可以读取自己的文件
CREATE POLICY "design_assets_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'design-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT id::text FROM creators WHERE auth_user_id = auth.uid()
        )
    );

-- public bucket 所有人可读（preview 图需要公开访问）
CREATE POLICY "design_assets_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'design-assets');

-- creator 可以删除自己的文件
CREATE POLICY "design_assets_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'design-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT id::text FROM creators WHERE auth_user_id = auth.uid()
        )
    );
