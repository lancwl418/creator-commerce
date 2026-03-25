-- ============================================================
-- Creator Commerce: Design 内容管理
-- ============================================================

-- designs
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

-- design_versions
CREATE TABLE design_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    changelog       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(design_id, version_number)
);

-- design_assets
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

-- design_tags
CREATE TABLE design_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    tag             VARCHAR(50) NOT NULL,
    UNIQUE(design_id, tag)
);

CREATE INDEX idx_design_tags_tag ON design_tags(tag);

-- 回填 designs.current_version_id 外键（避免循环依赖）
ALTER TABLE designs
    ADD CONSTRAINT fk_designs_current_version
    FOREIGN KEY (current_version_id) REFERENCES design_versions(id)
    ON DELETE SET NULL;

-- updated_at trigger
CREATE TRIGGER designs_updated_at
    BEFORE UPDATE ON designs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tags ENABLE ROW LEVEL SECURITY;

-- designs: creator 只能操作自己的 design
CREATE POLICY "designs_select_own" ON designs
    FOR SELECT USING (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "designs_insert_own" ON designs
    FOR INSERT WITH CHECK (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "designs_update_own" ON designs
    FOR UPDATE USING (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "designs_delete_own" ON designs
    FOR DELETE USING (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );

-- design_versions: 通过 design 关联 creator
CREATE POLICY "versions_select_own" ON design_versions
    FOR SELECT USING (
        design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()))
    );

CREATE POLICY "versions_insert_own" ON design_versions
    FOR INSERT WITH CHECK (
        design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()))
    );

-- design_assets: 通过 version → design 关联 creator
CREATE POLICY "assets_select_own" ON design_assets
    FOR SELECT USING (
        design_version_id IN (
            SELECT dv.id FROM design_versions dv
            JOIN designs d ON d.id = dv.design_id
            JOIN creators c ON c.id = d.creator_id
            WHERE c.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "assets_insert_own" ON design_assets
    FOR INSERT WITH CHECK (
        design_version_id IN (
            SELECT dv.id FROM design_versions dv
            JOIN designs d ON d.id = dv.design_id
            JOIN creators c ON c.id = d.creator_id
            WHERE c.auth_user_id = auth.uid()
        )
    );

-- design_tags: 通过 design 关联 creator
CREATE POLICY "tags_select_own" ON design_tags
    FOR SELECT USING (
        design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()))
    );

CREATE POLICY "tags_insert_own" ON design_tags
    FOR INSERT WITH CHECK (
        design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()))
    );

CREATE POLICY "tags_delete_own" ON design_tags
    FOR DELETE USING (
        design_id IN (SELECT id FROM designs WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid()))
    );
