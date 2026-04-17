-- ============================================================
-- 012: Custom Product SKUs
-- 定制 SKU，与 ERP 原有 blank SKU 严格分开
-- 每个 enabled variant（颜色 × 尺码）一条记录
-- 审核通过后回写 ERP 创建定制 SKU
-- ============================================================

CREATE TABLE custom_product_skus (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 关联到哪个产品实例
    sellable_product_instance_id UUID NOT NULL REFERENCES sellable_product_instances(id) ON DELETE CASCADE,
    -- ERP 原始产品 ID（不带 erp- 前缀）
    erp_product_id          VARCHAR(100) NOT NULL,
    -- 继承自哪个 blank SKU（ERP prodSkuList[].id）
    erp_sku_id              VARCHAR(100) NOT NULL,
    -- SKU 编码
    sku_code                VARCHAR(255),
    -- variant 属性（继承自 blank SKU）
    option1                 VARCHAR(255),
    option2                 VARCHAR(255),
    option3                 VARCHAR(255),
    -- 该 variant 的预览图（设计合成到对应颜色上）
    preview_image_url       VARCHAR(500),
    -- 售价（creator 设定的）
    sale_price              DECIMAL(10,2),
    -- 供应链成本快照（创建时拍下，不随 ERP 涨价变化）
    base_cost_snapshot      DECIMAL(10,2),
    -- ERP 回写状态
    erp_synced_sku_id       VARCHAR(100),       -- 回写 ERP 后得到的新 SKU ID
    erp_sync_status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (erp_sync_status IN ('pending', 'synced', 'error')),
    erp_sync_error          TEXT,
    erp_synced_at           TIMESTAMPTZ,
    -- 渠道同步状态（同步到 Shopify 等外部平台后记录外部 variant ID）
    external_variant_ids    JSONB DEFAULT '{}',  -- { "shopify": "variant_id", "etsy": "listing_id" }
    -- 关联到哪个 store connection（不同店铺各建一条 SKU）
    creator_store_connection_id UUID REFERENCES creator_store_connections(id),
    -- 是否启用
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),
    -- 同一产品 + 同一 blank SKU + 同一店铺 = 唯一
    UNIQUE(sellable_product_instance_id, erp_sku_id, creator_store_connection_id)
);

CREATE TRIGGER custom_product_skus_updated_at
    BEFORE UPDATE ON custom_product_skus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 索引
CREATE INDEX idx_custom_skus_product ON custom_product_skus(sellable_product_instance_id);
CREATE INDEX idx_custom_skus_erp_product ON custom_product_skus(erp_product_id);
CREATE INDEX idx_custom_skus_sync_status ON custom_product_skus(erp_sync_status);

-- RLS
ALTER TABLE custom_product_skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_skus_select_own" ON custom_product_skus
    FOR SELECT USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances
            WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "custom_skus_insert_own" ON custom_product_skus
    FOR INSERT WITH CHECK (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances
            WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "custom_skus_update_own" ON custom_product_skus
    FOR UPDATE USING (
        sellable_product_instance_id IN (
            SELECT id FROM sellable_product_instances
            WHERE creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );

-- ============================================================
-- channel_listing_variants: 每个渠道各 variant 独立定价
-- ============================================================

CREATE TABLE channel_listing_variants (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id      UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    custom_product_sku_id   UUID NOT NULL REFERENCES custom_product_skus(id) ON DELETE CASCADE,
    -- 对外售价（creator 自定义）
    sale_price              DECIMAL(10,2) NOT NULL,
    compare_at_price        DECIMAL(10,2),       -- 划线价（可选）
    -- 供应链成本快照（创建时拍，不随 ERP 变化）
    base_cost_snapshot      DECIMAL(10,2) NOT NULL,
    -- 外部平台的 variant ID
    external_variant_id     VARCHAR(255),
    -- 是否上架
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),
    UNIQUE(channel_listing_id, custom_product_sku_id)
);

CREATE TRIGGER channel_listing_variants_updated_at
    BEFORE UPDATE ON channel_listing_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE channel_listing_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_variants_select_own" ON channel_listing_variants
    FOR SELECT USING (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON cl.sellable_product_instance_id = spi.id
            WHERE spi.creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "listing_variants_insert_own" ON channel_listing_variants
    FOR INSERT WITH CHECK (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON cl.sellable_product_instance_id = spi.id
            WHERE spi.creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "listing_variants_update_own" ON channel_listing_variants
    FOR UPDATE USING (
        channel_listing_id IN (
            SELECT cl.id FROM channel_listings cl
            JOIN sellable_product_instances spi ON cl.sellable_product_instance_id = spi.id
            WHERE spi.creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
        )
    );
