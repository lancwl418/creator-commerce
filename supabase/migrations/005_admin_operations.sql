-- ============================================================
-- Creator Commerce: Admin 运营层
-- 选品决策记录、文件质检、上架追踪、运营配置
-- 为 MVP 运营驱动流 + 未来 AI 训练数据闭环设计
-- ============================================================

-- ============================================================
-- 1. Admin 用户表
-- ============================================================

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID UNIQUE NOT NULL,       -- Supabase auth.users（不建 FK 避免跨 schema 问题）
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(100),
    role            VARCHAR(30) NOT NULL
                    CHECK (role IN ('reviewer', 'operator', 'admin')),
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_users_auth ON admin_users(auth_user_id);

CREATE TRIGGER admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: 判断当前用户是否为 admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users
        WHERE auth_user_id = auth.uid()
          AND status = 'active'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. 扩展 designs 表 — 结构化元数据
-- style_tags: 预定义枚举多选（极简/波普/插画/文字类/自然系/暗黑系/复古/卡通/几何）
-- color_palette: 描述性文本（如 "深绿+米白"），不是 hex code
-- target_audience: JSONB 结构化，省去 AI 训练时 NLP 解析
--   示例: {"gender":"female","age_range":"25-35","interests":["outdoor","plants"]}
-- ============================================================

ALTER TABLE designs ADD COLUMN style_tags TEXT[] DEFAULT '{}';
ALTER TABLE designs ADD COLUMN color_palette VARCHAR(100);
ALTER TABLE designs ADD COLUMN target_audience JSONB DEFAULT '{}';

-- ============================================================
-- 3. 文件质量检测表
-- 独立于选品决策，只管文件层面 pass/fail
-- 每次人工质检留一条记录，未来可接自动检测脚本
-- ============================================================

CREATE TABLE design_asset_quality_checks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_asset_id     UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
    inspector_id        UUID REFERENCES admin_users(id),
    -- 检测项
    dpi_value           INT,
    dpi_valid           BOOLEAN,
    color_mode          VARCHAR(20),            -- 'RGB' / 'CMYK' / 'GRAY'
    color_mode_valid    BOOLEAN,
    dimensions_valid    BOOLEAN,
    -- 总结
    overall_status      VARCHAR(20) NOT NULL
                        CHECK (overall_status IN ('pass', 'warning', 'fail')),
    notes               TEXT,
    checked_at          TIMESTAMPTZ DEFAULT now(),
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quality_checks_asset ON design_asset_quality_checks(design_asset_id);
CREATE INDEX idx_quality_checks_status ON design_asset_quality_checks(overall_status);

-- ============================================================
-- 4. 选品决策表
-- 不含质检字段（已在 quality_checks 里），只管商业决策
-- 推荐产品用 JSONB 数组，不限定数量，方便未来 AI ranking
--
-- recommended_products 示例:
-- [
--   {"template_id":"uuid","template_name":"Unisex T-Shirt","priority":1,
--    "reason":"插画+自然系在T恤品类历史转化率最高（3.2%）"},
--   {"template_id":"uuid","template_name":"Tote Bag","priority":2,
--    "reason":"手提袋适合此人群画像"}
-- ]
--
-- not_recommended 示例:
-- [
--   {"template_id":"uuid","template_name":"Phone Case",
--    "reason":"图案细节在小尺寸损失严重"}
-- ]
-- ============================================================

CREATE TABLE product_selection_decisions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id               UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    creator_id              UUID NOT NULL REFERENCES creators(id),
    -- 推荐与不推荐
    recommended_products    JSONB NOT NULL DEFAULT '[]',
    not_recommended         JSONB DEFAULT '[]',
    -- 定价建议
    price_suggestion_min    DECIMAL(10,2),
    price_suggestion_max    DECIMAL(10,2),
    -- 决策状态
    decision_status         VARCHAR(20) DEFAULT 'pending'
                            CHECK (decision_status IN ('pending', 'approved', 'executed', 'archived')),
    decided_by              UUID REFERENCES admin_users(id),
    decided_at              TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_selection_decisions_design ON product_selection_decisions(design_id);
CREATE INDEX idx_selection_decisions_creator ON product_selection_decisions(creator_id);
CREATE INDEX idx_selection_decisions_status ON product_selection_decisions(decision_status);

CREATE TRIGGER selection_decisions_updated_at
    BEFORE UPDATE ON product_selection_decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. 上架运营追踪表
-- 关联回 selection_decision 形成 AI 训练数据闭环:
--   决策 → 上架 → 追踪效果 → 反馈评估决策质量
-- 每个 listing 可有多条 review（不同时间窗口）
-- ============================================================

CREATE TABLE listing_performance_reviews (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id      UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    selection_decision_id   UUID REFERENCES product_selection_decisions(id),  -- 闭环关联
    -- 追踪窗口
    review_period_start     DATE NOT NULL,
    review_period_end       DATE NOT NULL,
    -- KPI（人工填写，未来可对接 analytics API 自动采集）
    view_count              INT DEFAULT 0,
    add_to_cart_count       INT DEFAULT 0,
    purchase_count          INT DEFAULT 0,
    gmv                     DECIMAL(10,2) DEFAULT 0,
    cart_rate               DECIMAL(5,4),           -- 加购率，小数形式 0.0420 = 4.2%
    conversion_rate         DECIMAL(5,4),           -- 转化率，小数形式 0.0180 = 1.8%
    -- 复盘
    review_conclusion       VARCHAR(30)
                            CHECK (review_conclusion IN ('continue', 'adjust_price', 'change_product', 'delist')),
    review_notes            TEXT,
    reviewer_id             UUID REFERENCES admin_users(id),
    reviewed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_performance_reviews_listing ON listing_performance_reviews(channel_listing_id);
CREATE INDEX idx_performance_reviews_decision ON listing_performance_reviews(selection_decision_id);

-- ============================================================
-- 6. 扩展 preview_assets 表 — Mockup 双轨制
-- preview: 设计师预览用快速渲染版
-- marketing: 销售/广告用版本，运营团队二次处理
-- ============================================================

ALTER TABLE preview_assets ADD COLUMN preview_purpose VARCHAR(30) DEFAULT 'preview'
    CHECK (preview_purpose IN ('preview', 'marketing'));
ALTER TABLE preview_assets ADD COLUMN is_ad_grade BOOLEAN DEFAULT FALSE;
ALTER TABLE preview_assets ADD COLUMN uploaded_by VARCHAR(30) DEFAULT 'system'
    CHECK (uploaded_by IN ('system', 'admin', 'creator'));

-- ============================================================
-- 7. 运营配置表
-- Key-Value 存储运营参数，Admin 可调整
-- ============================================================

CREATE TABLE operating_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key      VARCHAR(100) UNIQUE NOT NULL,
    config_value    JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER operating_config_updated_at
    BEFORE UPDATE ON operating_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 初始配置数据
INSERT INTO operating_config (config_key, config_value, description) VALUES
    ('style_tags', '["极简","波普","插画","文字类","自然系","暗黑系","复古","卡通","几何"]',
     '设计风格标签枚举，用于 designs.style_tags 的可选值'),
    ('target_audience_presets', '{"genders":["male","female","unisex"],"age_ranges":["18-24","25-34","35-44","45+"],"interest_categories":["outdoor","sports","fashion","tech","art","music","animals","food","travel"]}',
     '目标人群预设选项'),
    ('royalty_rates', '{"standard":0.15,"premium":0.20}',
     'Marketplace 模式下 creator royalty 费率'),
    ('service_fee_rates', '{"standard":0.05}',
     'Creator Store 模式下平台服务费率'),
    ('quality_check_rules', '{"min_dpi":150,"recommended_dpi":300,"allowed_color_modes":["RGB","CMYK"],"min_width_px":2000,"min_height_px":2000}',
     '文件质量检测规则参数');

-- ============================================================
-- 8. RLS 策略
-- ============================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_asset_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_selection_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_config ENABLE ROW LEVEL SECURITY;

-- admin_users: 只有 admin 可读写
CREATE POLICY "admin_users_select_admin" ON admin_users
    FOR SELECT USING (is_admin());
CREATE POLICY "admin_users_insert_admin" ON admin_users
    FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_users_update_admin" ON admin_users
    FOR UPDATE USING (is_admin());

-- design_asset_quality_checks: admin 可读写全部，creator 可读自己设计的检测结果
CREATE POLICY "quality_checks_admin_all" ON design_asset_quality_checks
    FOR ALL USING (is_admin());
CREATE POLICY "quality_checks_creator_select" ON design_asset_quality_checks
    FOR SELECT USING (
        design_asset_id IN (
            SELECT da.id FROM design_assets da
            JOIN design_versions dv ON dv.id = da.design_version_id
            JOIN designs d ON d.id = dv.design_id
            WHERE d.creator_id = get_my_creator_id()
        )
    );

-- product_selection_decisions: admin 可读写全部，creator 可读自己的
CREATE POLICY "selection_decisions_admin_all" ON product_selection_decisions
    FOR ALL USING (is_admin());
CREATE POLICY "selection_decisions_creator_select" ON product_selection_decisions
    FOR SELECT USING (creator_id = get_my_creator_id());

-- listing_performance_reviews: admin 可读写全部，creator 可读自己 listing 的
CREATE POLICY "performance_reviews_admin_all" ON listing_performance_reviews
    FOR ALL USING (is_admin());
CREATE POLICY "performance_reviews_creator_select" ON listing_performance_reviews
    FOR SELECT USING (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON spi.id = cl.sellable_product_instance_id
            WHERE spi.creator_id = get_my_creator_id()
        )
    );

-- operating_config: admin 可读写，所有认证用户可读
CREATE POLICY "config_admin_all" ON operating_config
    FOR ALL USING (is_admin());
CREATE POLICY "config_authenticated_select" ON operating_config
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 现有表增加 admin 可读策略（designs、design_assets 等原来只有 creator 自己能读）
CREATE POLICY "designs_admin_select" ON designs
    FOR SELECT USING (is_admin());
CREATE POLICY "designs_admin_update" ON designs
    FOR UPDATE USING (is_admin());
CREATE POLICY "design_versions_admin_select" ON design_versions
    FOR SELECT USING (is_admin());
CREATE POLICY "design_assets_admin_select" ON design_assets
    FOR SELECT USING (is_admin());
CREATE POLICY "design_tags_admin_select" ON design_tags
    FOR SELECT USING (is_admin());
CREATE POLICY "design_tags_admin_manage" ON design_tags
    FOR ALL USING (is_admin());
CREATE POLICY "spi_admin_select" ON sellable_product_instances
    FOR SELECT USING (is_admin());
CREATE POLICY "spi_admin_update" ON sellable_product_instances
    FOR UPDATE USING (is_admin());
CREATE POLICY "channel_listings_admin_select" ON channel_listings
    FOR SELECT USING (is_admin());
CREATE POLICY "channel_listings_admin_update" ON channel_listings
    FOR UPDATE USING (is_admin());
CREATE POLICY "preview_assets_admin_all" ON preview_assets
    FOR ALL USING (is_admin());
CREATE POLICY "creators_admin_select" ON creators
    FOR SELECT USING (is_admin());
CREATE POLICY "creator_profiles_admin_select" ON creator_profiles
    FOR SELECT USING (is_admin());
