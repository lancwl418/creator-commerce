-- ============================================================
-- Creator Commerce: 初始化 Migration（一次执行）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- ============================================================
-- 1. Creator 身份与 Profile
-- ============================================================

CREATE TABLE creators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    erp_partner_id  UUID,
    email           VARCHAR(255) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
    onboarding_step VARCHAR(30) DEFAULT 'profile'
                    CHECK (onboarding_step IN ('profile', 'completed')),
    agreed_terms_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_creators_auth_user ON creators(auth_user_id);
CREATE INDEX idx_creators_erp_partner ON creators(erp_partner_id);

CREATE TABLE creator_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID UNIQUE NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    display_name    VARCHAR(100) NOT NULL DEFAULT '',
    slug            VARCHAR(100) UNIQUE,
    bio             TEXT DEFAULT '',
    avatar_url      VARCHAR(500),
    banner_url      VARCHAR(500),
    social_links    JSONB DEFAULT '{}',
    country         VARCHAR(2),
    timezone        VARCHAR(50),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Design 内容管理
-- ============================================================

CREATE TABLE designs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT DEFAULT '',
    category        VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived', 'rejected')),
    rejection_reason TEXT,
    current_version_id UUID,
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_designs_creator ON designs(creator_id);
CREATE INDEX idx_designs_status ON designs(status);

CREATE TABLE design_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    changelog       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(design_id, version_number)
);

CREATE TABLE design_assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
    asset_type        VARCHAR(30) NOT NULL
                      CHECK (asset_type IN ('artwork', 'preview', 'source_file')),
    file_url          VARCHAR(500) NOT NULL,
    file_name         VARCHAR(255),
    file_size         BIGINT,
    mime_type         VARCHAR(100),
    width_px          INT,
    height_px         INT,
    dpi               INT,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_design_assets_version ON design_assets(design_version_id);

CREATE TABLE design_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    tag             VARCHAR(50) NOT NULL,
    UNIQUE(design_id, tag)
);

CREATE INDEX idx_design_tags_tag ON design_tags(tag);

ALTER TABLE designs
    ADD CONSTRAINT fk_designs_current_version
    FOREIGN KEY (current_version_id) REFERENCES design_versions(id)
    ON DELETE SET NULL;

-- ============================================================
-- 3. Functions & Triggers
-- ============================================================

-- 自动创建 creator + profile 当用户注册
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_creator_id UUID;
BEGIN
    INSERT INTO creators (auth_user_id, email, status)
    VALUES (NEW.id, NEW.email, 'active')
    RETURNING id INTO new_creator_id;

    INSERT INTO creator_profiles (creator_id, display_name)
    VALUES (new_creator_id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 自动更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER designs_updated_at BEFORE UPDATE ON designs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. RLS Policies
-- ============================================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tags ENABLE ROW LEVEL SECURITY;

-- creators
CREATE POLICY "creators_select_own" ON creators
    FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "creators_update_own" ON creators
    FOR UPDATE USING (auth_user_id = auth.uid());

-- creator_profiles
CREATE POLICY "profiles_select_own" ON creator_profiles
    FOR SELECT USING (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));
CREATE POLICY "profiles_update_own" ON creator_profiles
    FOR UPDATE USING (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));

-- designs
CREATE POLICY "designs_select_own" ON designs
    FOR SELECT USING (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));
CREATE POLICY "designs_insert_own" ON designs
    FOR INSERT WITH CHECK (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));
CREATE POLICY "designs_update_own" ON designs
    FOR UPDATE USING (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));
CREATE POLICY "designs_delete_own" ON designs
    FOR DELETE USING (creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()));

-- design_versions
CREATE POLICY "versions_select_own" ON design_versions
    FOR SELECT USING (design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));
CREATE POLICY "versions_insert_own" ON design_versions
    FOR INSERT WITH CHECK (design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));

-- design_assets
CREATE POLICY "assets_select_own" ON design_assets
    FOR SELECT USING (design_version_id IN (SELECT dv.id FROM design_versions dv JOIN designs d ON d.id = dv.design_id WHERE d.creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));
CREATE POLICY "assets_insert_own" ON design_assets
    FOR INSERT WITH CHECK (design_version_id IN (SELECT dv.id FROM design_versions dv JOIN designs d ON d.id = dv.design_id WHERE d.creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));

-- design_tags
CREATE POLICY "tags_select_own" ON design_tags
    FOR SELECT USING (design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));
CREATE POLICY "tags_insert_own" ON design_tags
    FOR INSERT WITH CHECK (design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));
CREATE POLICY "tags_delete_own" ON design_tags
    FOR DELETE USING (design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())));

-- ============================================================
-- 5. Storage
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('design-assets', 'design-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "design_assets_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'design-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT id::text FROM creators WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "design_assets_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'design-assets');

CREATE POLICY "design_assets_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'design-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT id::text FROM creators WHERE auth_user_id = auth.uid()
        )
    );
