-- ============================================================
-- 033: 批量单（购物车）支持带设计的行
--
-- 设计文件在加入批量单时就传 R2，行上存 design_files + faces；
-- 白板行 faces = 0。同一 SKU 的白板行仍然唯一（数量累加），
-- 带设计的行各自独立（同一 SKU 可以有不同设计），改用部分唯一索引。
-- ============================================================

ALTER TABLE cn_cart_items ADD COLUMN IF NOT EXISTS design_files JSONB;
ALTER TABLE cn_cart_items ADD COLUMN IF NOT EXISTS faces INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cn_cart_items DROP CONSTRAINT IF EXISTS cn_cart_items_creator_id_sku_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cn_cart_items_blank_unique
    ON cn_cart_items (creator_id, sku_id) WHERE faces = 0;
