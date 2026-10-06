-- ============================================================
-- 024: 中国卖家平台 · 产品模块三张表的行级安全
--
-- 023 建表时没有开启 RLS，持有前端公开 key 的任何人都能读写这三张表。
-- 它们只由 cn-portal 读取；写入（库存导入、可见性与起订量维护）由运营经
-- 服务端密钥完成（service role 不受 RLS 限制），所以这里只开放读取。
-- ============================================================

ALTER TABLE seller_product_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_moq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_product_visibility_select_all" ON seller_product_visibility;
CREATE POLICY "seller_product_visibility_select_all" ON seller_product_visibility
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_stock_snapshot_select_all" ON product_stock_snapshot;
CREATE POLICY "product_stock_snapshot_select_all" ON product_stock_snapshot
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_moq_select_all" ON product_moq;
CREATE POLICY "product_moq_select_all" ON product_moq
    FOR SELECT USING (true);
