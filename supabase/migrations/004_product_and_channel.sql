-- ============================================================
-- Creator Commerce: 产品配置、可售产品、渠道分发、同步
-- ERP 表（products, product_templates, skus 等）不在本 DB
-- product_template_id 等 ERP 引用只存 UUID，不建外键
-- ============================================================

-- ============================================================
-- 1. Creator Store Connections
-- ============================================================

CREATE TABLE creator_store_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    platform            VARCHAR(30) NOT NULL
                        CHECK (platform IN ('shopify', 'tiktok_shop', 'etsy')),
    store_name          VARCHAR(255),
    store_url           VARCHAR(500),
    access_token        TEXT,                       -- 加密存储
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    scopes              TEXT[],
    status              VARCHAR(20) DEFAULT 'connected'
                        CHECK (status IN ('connected', 'disconnected', 'expired', 'error')),
    last_sync_at        TIMESTAMPTZ,
    metadata            JSONB DEFAULT '{}',
    connected_at        TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, platform)
);

CREATE TRIGGER store_connections_updated_at
    BEFORE UPDATE ON creator_store_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Design Engine Tables
-- ============================================================

-- print_areas: 产品模板的印刷区域定义
-- product_template_id 引用 ERP 的 product_templates，不建外键
CREATE TABLE print_areas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_template_id UUID NOT NULL,              -- ERP product_templates.id (无外键)
    name                VARCHAR(100) NOT NULL,      -- 'front', 'back', 'left_sleeve'
    position_x          DECIMAL(8,2) NOT NULL,      -- 印刷区域左上角 X (mm)
    position_y          DECIMAL(8,2) NOT NULL,
    width               DECIMAL(8,2) NOT NULL,      -- 印刷区域宽 (mm)
    height              DECIMAL(8,2) NOT NULL,
    safe_zone_margin    DECIMAL(8,2) DEFAULT 0,     -- 安全边距 (mm)
    max_dpi             INT DEFAULT 300,
    sort_order          INT DEFAULT 0,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_print_areas_template ON print_areas(product_template_id);

-- editor_sessions: 编辑器会话
CREATE TABLE editor_sessions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                  UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    product_template_id         UUID NOT NULL,      -- ERP 引用
    design_version_id           UUID NOT NULL REFERENCES design_versions(id),
    sellable_product_instance_id UUID,              -- 如果是编辑已有实例（后面建表后不加外键，避免循环）
    session_data                JSONB DEFAULT '{}', -- 编辑器完整状态快照
    status                      VARCHAR(20) DEFAULT 'active'
                                CHECK (status IN ('active', 'saved', 'expired')),
    expires_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_editor_sessions_creator ON editor_sessions(creator_id);
CREATE INDEX idx_editor_sessions_status ON editor_sessions(status);

CREATE TRIGGER editor_sessions_updated_at
    BEFORE UPDATE ON editor_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Sellable Product Instances
-- ============================================================

CREATE TABLE sellable_product_instances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id              UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    design_id               UUID NOT NULL REFERENCES designs(id),
    design_version_id       UUID NOT NULL REFERENCES design_versions(id),
    product_template_id     UUID NOT NULL,          -- ERP 引用
    title                   VARCHAR(255),
    description             TEXT,
    status                  VARCHAR(20) DEFAULT 'draft'
                            CHECK (status IN ('draft', 'ready', 'listed', 'paused', 'archived')),
    base_price_suggestion   DECIMAL(10,2),
    print_file_url          VARCHAR(500),
    preview_urls            JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spi_creator ON sellable_product_instances(creator_id);
CREATE INDEX idx_spi_design ON sellable_product_instances(design_id);
CREATE INDEX idx_spi_template ON sellable_product_instances(product_template_id);

CREATE TRIGGER spi_updated_at
    BEFORE UPDATE ON sellable_product_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Product Configurations (Design Engine 输出)
-- ============================================================

CREATE TABLE product_configurations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sellable_product_instance_id UUID UNIQUE NOT NULL REFERENCES sellable_product_instances(id) ON DELETE CASCADE,
    design_version_id           UUID NOT NULL REFERENCES design_versions(id),
    product_template_id         UUID NOT NULL,      -- ERP 引用
    layers                      JSONB NOT NULL DEFAULT '[]',
    -- layers 示例:
    -- [
    --   {
    --     "print_area_id": "uuid",
    --     "artwork_asset_id": "uuid",
    --     "transform": {"x": 120, "y": 80, "scale": 1.2, "rotation": 0},
    --     "z_index": 1,
    --     "visible": true
    --   }
    -- ]
    editor_session_id           UUID REFERENCES editor_sessions(id),
    finalized_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER product_configs_updated_at
    BEFORE UPDATE ON product_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- preview_assets: 产品配置的预览图
CREATE TABLE preview_assets (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_configuration_id    UUID NOT NULL REFERENCES product_configurations(id) ON DELETE CASCADE,
    preview_type                VARCHAR(30) NOT NULL
                                CHECK (preview_type IN ('front', 'back', 'angle_45', 'lifestyle')),
    file_url                    VARCHAR(500) NOT NULL,
    width_px                    INT,
    height_px                   INT,
    generated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_preview_assets_config ON preview_assets(product_configuration_id);

-- print_assets: 印刷文件
CREATE TABLE print_assets (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_configuration_id    UUID NOT NULL REFERENCES product_configurations(id) ON DELETE CASCADE,
    print_area_id               UUID NOT NULL REFERENCES print_areas(id),
    file_url                    VARCHAR(500) NOT NULL,
    file_format                 VARCHAR(10) DEFAULT 'PDF'
                                CHECK (file_format IN ('PDF', 'PNG', 'TIFF')),
    dpi                         INT DEFAULT 300,
    color_profile               VARCHAR(30) DEFAULT 'CMYK',
    file_size                   BIGINT,
    generated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_print_assets_config ON print_assets(product_configuration_id);

-- ============================================================
-- 5. Channel Distribution
-- ============================================================

CREATE TABLE channel_listings (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sellable_product_instance_id    UUID NOT NULL REFERENCES sellable_product_instances(id) ON DELETE CASCADE,
    channel_type                    VARCHAR(30) NOT NULL
                                    CHECK (channel_type IN ('marketplace', 'creator_store')),
    creator_store_connection_id     UUID REFERENCES creator_store_connections(id),  -- NULL = marketplace
    external_product_id             VARCHAR(200),
    external_listing_url            VARCHAR(500),
    price                           DECIMAL(10,2) NOT NULL,
    compare_at_price                DECIMAL(10,2),
    currency                        VARCHAR(3) DEFAULT 'USD',
    status                          VARCHAR(20) DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'pending', 'active', 'paused', 'error', 'removed')),
    published_at                    TIMESTAMPTZ,
    error_message                   TEXT,
    metadata                        JSONB DEFAULT '{}',
    created_at                      TIMESTAMPTZ DEFAULT now(),
    updated_at                      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sellable_product_instance_id, channel_type, creator_store_connection_id)
);

CREATE INDEX idx_channel_listings_spi ON channel_listings(sellable_product_instance_id);
CREATE INDEX idx_channel_listings_status ON channel_listings(status);

CREATE TRIGGER channel_listings_updated_at
    BEFORE UPDATE ON channel_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- sync_jobs: 渠道同步任务
CREATE TABLE sync_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id  UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    action              VARCHAR(20) NOT NULL
                        CHECK (action IN ('create', 'update', 'delete', 'sync_inventory')),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts            INT DEFAULT 0,
    max_attempts        INT DEFAULT 3,
    request_payload     JSONB,
    response_payload    JSONB,
    error_message       TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    next_retry_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_jobs_status ON sync_jobs(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_sync_jobs_listing ON sync_jobs(channel_listing_id);

-- publishing_records: 发布审计日志
CREATE TABLE publishing_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id  UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    action              VARCHAR(30) NOT NULL
                        CHECK (action IN ('publish', 'unpublish', 'price_change', 'sync')),
    actor_type          VARCHAR(20) NOT NULL
                        CHECK (actor_type IN ('creator', 'system', 'admin')),
    actor_id            UUID,
    before_state        JSONB,
    after_state         JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publishing_records_listing ON publishing_records(channel_listing_id);

-- ============================================================
-- 6. Creator Earnings Summary (从 ERP 同步的缓存表)
-- ============================================================

CREATE TABLE creator_earnings_summary (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    erp_partner_id  UUID NOT NULL,
    period          VARCHAR(7) NOT NULL,        -- '2026-03'
    channel_type    VARCHAR(30) NOT NULL,
    total_orders    INT DEFAULT 0,
    total_units     INT DEFAULT 0,
    gross_revenue   DECIMAL(10,2) DEFAULT 0,
    total_cost      DECIMAL(10,2) DEFAULT 0,
    platform_fees   DECIMAL(10,2) DEFAULT 0,
    net_earnings    DECIMAL(10,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'USD',
    synced_at       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, period, channel_type)
);

CREATE INDEX idx_earnings_creator ON creator_earnings_summary(creator_id);

CREATE TRIGGER earnings_summary_updated_at
    BEFORE UPDATE ON creator_earnings_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. RLS Policies
-- ============================================================

ALTER TABLE creator_store_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellable_product_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings_summary ENABLE ROW LEVEL SECURITY;
-- print_areas 是系统数据，所有 creator 可读，不需要按 creator 隔离
ALTER TABLE print_areas ENABLE ROW LEVEL SECURITY;

-- Helper: 获取当前用户的 creator_id
CREATE OR REPLACE FUNCTION get_my_creator_id()
RETURNS UUID AS $$
    SELECT id FROM creators WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- creator_store_connections
CREATE POLICY "store_conn_select_own" ON creator_store_connections
    FOR SELECT USING (creator_id = get_my_creator_id());
CREATE POLICY "store_conn_insert_own" ON creator_store_connections
    FOR INSERT WITH CHECK (creator_id = get_my_creator_id());
CREATE POLICY "store_conn_update_own" ON creator_store_connections
    FOR UPDATE USING (creator_id = get_my_creator_id());
CREATE POLICY "store_conn_delete_own" ON creator_store_connections
    FOR DELETE USING (creator_id = get_my_creator_id());

-- print_areas: 所有已认证用户可读
CREATE POLICY "print_areas_select_all" ON print_areas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- editor_sessions
CREATE POLICY "sessions_select_own" ON editor_sessions
    FOR SELECT USING (creator_id = get_my_creator_id());
CREATE POLICY "sessions_insert_own" ON editor_sessions
    FOR INSERT WITH CHECK (creator_id = get_my_creator_id());
CREATE POLICY "sessions_update_own" ON editor_sessions
    FOR UPDATE USING (creator_id = get_my_creator_id());

-- sellable_product_instances
CREATE POLICY "spi_select_own" ON sellable_product_instances
    FOR SELECT USING (creator_id = get_my_creator_id());
CREATE POLICY "spi_insert_own" ON sellable_product_instances
    FOR INSERT WITH CHECK (creator_id = get_my_creator_id());
CREATE POLICY "spi_update_own" ON sellable_product_instances
    FOR UPDATE USING (creator_id = get_my_creator_id());
CREATE POLICY "spi_delete_own" ON sellable_product_instances
    FOR DELETE USING (creator_id = get_my_creator_id());

-- product_configurations: 通过 sellable_product_instance 关联 creator
CREATE POLICY "configs_select_own" ON product_configurations
    FOR SELECT USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "configs_insert_own" ON product_configurations
    FOR INSERT WITH CHECK (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "configs_update_own" ON product_configurations
    FOR UPDATE USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );

-- preview_assets: 通过 config → spi 关联 creator
CREATE POLICY "preview_select_own" ON preview_assets
    FOR SELECT USING (
        product_configuration_id IN (
            SELECT pc.id FROM product_configurations pc
            JOIN sellable_product_instances spi ON spi.id = pc.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "preview_insert_own" ON preview_assets
    FOR INSERT WITH CHECK (
        product_configuration_id IN (
            SELECT pc.id FROM product_configurations pc
            JOIN sellable_product_instances spi ON spi.id = pc.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );

-- print_assets: 同上
CREATE POLICY "print_assets_select_own" ON print_assets
    FOR SELECT USING (
        product_configuration_id IN (
            SELECT pc.id FROM product_configurations pc
            JOIN sellable_product_instances spi ON spi.id = pc.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "print_assets_insert_own" ON print_assets
    FOR INSERT WITH CHECK (
        product_configuration_id IN (
            SELECT pc.id FROM product_configurations pc
            JOIN sellable_product_instances spi ON spi.id = pc.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );

-- channel_listings: 通过 spi 关联 creator
CREATE POLICY "listings_select_own" ON channel_listings
    FOR SELECT USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "listings_insert_own" ON channel_listings
    FOR INSERT WITH CHECK (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );
CREATE POLICY "listings_update_own" ON channel_listings
    FOR UPDATE USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances WHERE creator_id = get_my_creator_id()
        )
    );

-- sync_jobs: 通过 listing → spi 关联 creator
CREATE POLICY "sync_jobs_select_own" ON sync_jobs
    FOR SELECT USING (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON spi.id = cl.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );

-- publishing_records: 通过 listing → spi 关联 creator
CREATE POLICY "pub_records_select_own" ON publishing_records
    FOR SELECT USING (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON spi.id = cl.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );

-- creator_earnings_summary
CREATE POLICY "earnings_select_own" ON creator_earnings_summary
    FOR SELECT USING (creator_id = get_my_creator_id());
