-- ============================================================
-- 028: 后台管理中国卖家 + 可见性表按等级读取
--
-- cn_sellers：Admin 后台需要查看全部卖家并调整等级（is_admin() 见 005）。
-- seller_product_visibility：卖家只读自己等级的行；此前所有等级的行都可读（024）。
-- ============================================================

DROP POLICY IF EXISTS "cn_sellers_admin_select" ON cn_sellers;
CREATE POLICY "cn_sellers_admin_select" ON cn_sellers
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "cn_sellers_admin_update" ON cn_sellers;
CREATE POLICY "cn_sellers_admin_update" ON cn_sellers
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "seller_product_visibility_select_all" ON seller_product_visibility;
DROP POLICY IF EXISTS "seller_product_visibility_select_own_tier" ON seller_product_visibility;
CREATE POLICY "seller_product_visibility_select_own_tier" ON seller_product_visibility
    FOR SELECT USING (
        is_admin()
        OR seller_tier = (SELECT seller_tier FROM cn_sellers WHERE auth_user_id = auth.uid())
    );
