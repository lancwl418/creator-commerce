-- ============================================================
-- 030: 中国卖家采购单（白板 / 带设计的直接下单）
--
-- 第一版不接支付：卖家提交后状态为 pending_confirmation，由运营在 Admin 确认或取消；
-- 推送 ERP 的订单 id 与状态字段预留。金额快照在下单时拍下，不随 ERP 调价变化。
-- ============================================================

CREATE TABLE IF NOT EXISTS cn_bulk_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    order_type          TEXT NOT NULL CHECK (order_type IN ('blank', 'designed')),
    status              TEXT NOT NULL DEFAULT 'pending_confirmation'
                        CHECK (status IN ('pending_confirmation', 'confirmed', 'cancelled')),
    -- 带设计时指向已建产品；白板单为空
    product_instance_id UUID REFERENCES sellable_product_instances(id) ON DELETE SET NULL,
    erp_product_id      TEXT NOT NULL,
    product_title       TEXT NOT NULL,
    -- [{ sku_id, sku, option1, option2, option3, quantity, unit_cost }]
    items               JSONB NOT NULL,
    subtotal            DECIMAL(12,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    -- { name, phone, country, province, city, address1, address2, zip }
    shipping_address    JSONB NOT NULL,
    -- 上传设计下单：[{ face, design_url, preview_url }]，face 取 ERP 的 printPositions（front / back …）
    design_files        JSONB NOT NULL DEFAULT '[]',
    -- 设计了几面，决定印花价取 face_N
    faces               INTEGER,
    note                TEXT,
    erp_order_id        TEXT,
    erp_sync_status     TEXT CHECK (erp_sync_status IN ('pending', 'synced', 'failed')),
    erp_sync_error      TEXT,
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cn_bulk_orders_creator ON cn_bulk_orders (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cn_bulk_orders_status ON cn_bulk_orders (status, created_at DESC);

DROP TRIGGER IF EXISTS cn_bulk_orders_updated_at ON cn_bulk_orders;
CREATE TRIGGER cn_bulk_orders_updated_at
    BEFORE UPDATE ON cn_bulk_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cn_bulk_orders ENABLE ROW LEVEL SECURITY;

-- 卖家：读、建自己的采购单；提交后不能改（状态由运营变更）
DROP POLICY IF EXISTS "cn_bulk_orders_select_own" ON cn_bulk_orders;
CREATE POLICY "cn_bulk_orders_select_own" ON cn_bulk_orders
    FOR SELECT USING (creator_id = get_my_creator_id());
DROP POLICY IF EXISTS "cn_bulk_orders_insert_own" ON cn_bulk_orders;
CREATE POLICY "cn_bulk_orders_insert_own" ON cn_bulk_orders
    FOR INSERT WITH CHECK (creator_id = get_my_creator_id());

-- 运营：读全部、改状态
DROP POLICY IF EXISTS "cn_bulk_orders_admin_select" ON cn_bulk_orders;
CREATE POLICY "cn_bulk_orders_admin_select" ON cn_bulk_orders
    FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "cn_bulk_orders_admin_update" ON cn_bulk_orders;
CREATE POLICY "cn_bulk_orders_admin_update" ON cn_bulk_orders
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
