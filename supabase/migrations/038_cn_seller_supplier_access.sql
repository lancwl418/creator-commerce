-- ============================================================
-- 038: cn-portal 按账号限定可见供应商
--
-- 每个中国卖家账号可以有一份供应商白名单：
--   - 白名单为空 → 看全部供应商的产品（默认，注册后即如此）
--   - 白名单非空 → 只看主供应商（ERP mainSupplierId）在名单里的产品
-- 卖家注册后由管理员在 Admin 审核并分配，之后也可随时修改。
-- 只控制「新的」浏览 / 建品 / 下单入口；已建好的产品和已下的订单不受影响。
-- ============================================================

CREATE TABLE IF NOT EXISTS cn_seller_supplier_access (
    creator_id   UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    -- ERP 供应商 id（products.mainSupplierId）
    supplier_id  TEXT NOT NULL CHECK (length(trim(supplier_id)) > 0),
    created_by   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (creator_id, supplier_id)
);

ALTER TABLE cn_seller_supplier_access ENABLE ROW LEVEL SECURITY;

-- 卖家只能读自己的白名单（目录过滤用）；管理员能读写全部
DROP POLICY IF EXISTS "cn_seller_supplier_access_select_own" ON cn_seller_supplier_access;
CREATE POLICY "cn_seller_supplier_access_select_own" ON cn_seller_supplier_access
    FOR SELECT USING (creator_id = get_my_creator_id() OR is_admin());
DROP POLICY IF EXISTS "cn_seller_supplier_access_admin_write" ON cn_seller_supplier_access;
CREATE POLICY "cn_seller_supplier_access_admin_write" ON cn_seller_supplier_access
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 整体替换某个卖家的白名单（一个事务内删旧插新）。空数组 = 清空 = 看全部。
-- SECURITY INVOKER：写入仍受上面的 RLS 约束，这里再显式拦一次非管理员。
CREATE OR REPLACE FUNCTION set_cn_seller_supplier_access(p_creator_id UUID, p_supplier_ids TEXT[])
RETURNS VOID AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can change seller supplier access';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM creators WHERE id = p_creator_id AND user_type = 'cn_seller') THEN
        RAISE EXCEPTION 'CN seller % not found', p_creator_id;
    END IF;

    DELETE FROM cn_seller_supplier_access WHERE creator_id = p_creator_id;

    INSERT INTO cn_seller_supplier_access (creator_id, supplier_id, created_by)
    SELECT DISTINCT p_creator_id, trim(s), auth.uid()
    FROM unnest(COALESCE(p_supplier_ids, ARRAY[]::TEXT[])) AS s
    WHERE length(trim(s)) > 0;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;
