-- ============================================================
-- 031: 批量下单（购物车）与表格下单
--
-- 采购单可以包含多个产品：产品信息下沉到 items[]（erp_product_id / product_title），
-- 单上的 erp_product_id / product_title 只在单产品（含上传设计）时填写。
-- cn_cart_items：卖家的批量单草稿，结算时合成一张采购单。
-- ============================================================

ALTER TABLE cn_bulk_orders ALTER COLUMN erp_product_id DROP NOT NULL;
ALTER TABLE cn_bulk_orders ALTER COLUMN product_title DROP NOT NULL;

CREATE TABLE IF NOT EXISTS cn_cart_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    erp_product_id  TEXT NOT NULL,
    product_title   TEXT NOT NULL,
    sku_id          TEXT NOT NULL,
    sku             TEXT NOT NULL,
    option1         TEXT,
    option2         TEXT,
    option3         TEXT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (creator_id, sku_id)
);
CREATE INDEX IF NOT EXISTS idx_cn_cart_items_creator ON cn_cart_items (creator_id, created_at);

DROP TRIGGER IF EXISTS cn_cart_items_updated_at ON cn_cart_items;
CREATE TRIGGER cn_cart_items_updated_at
    BEFORE UPDATE ON cn_cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cn_cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cn_cart_items_own" ON cn_cart_items;
CREATE POLICY "cn_cart_items_own" ON cn_cart_items
    FOR ALL USING (creator_id = get_my_creator_id()) WITH CHECK (creator_id = get_my_creator_id());
