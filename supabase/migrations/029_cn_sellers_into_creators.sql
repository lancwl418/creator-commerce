-- ============================================================
-- 029: 中国卖家并入 creators（2026-10-11 决定：复用 Creator Portal 的店铺 / 产品 / 订单链路）
--
-- 中国卖家成为 creators 的一种 user_type（cn_seller），店铺连接、产品、listing、订单
-- 全部按 creator_id 复用；卖家专属字段（等级、公司、联系人、ERP 客户）加在 creators 上。
-- cn_sellers（026）并入后废弃。
-- ============================================================

-- 1. user_type 增加 cn_seller
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_user_type_check;
ALTER TABLE creators ADD CONSTRAINT creators_user_type_check
    CHECK (user_type IN ('designer', 'distributor', 'cn_seller'));

-- 2. 卖家字段
ALTER TABLE creators
    ADD COLUMN IF NOT EXISTS seller_tier           cn_seller_tier,
    ADD COLUMN IF NOT EXISTS company_name          VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_name          VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS phone                 VARCHAR(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS erp_customer_id       TEXT,
    ADD COLUMN IF NOT EXISTS erp_customer_level_id TEXT,
    ADD COLUMN IF NOT EXISTS erp_synced_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS erp_sync_status       TEXT CHECK (erp_sync_status IN ('pending', 'synced', 'failed')),
    ADD COLUMN IF NOT EXISTS erp_sync_error        TEXT;

-- 中国卖家必须有价格等级
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_cn_seller_tier_check;
ALTER TABLE creators ADD CONSTRAINT creators_cn_seller_tier_check
    CHECK (user_type <> 'cn_seller' OR seller_tier IS NOT NULL);

-- 3. 迁移 cn_sellers 现有账户
INSERT INTO creators (
    auth_user_id, email, status, user_type, seller_tier, company_name, contact_name, phone,
    erp_customer_id, erp_customer_level_id, erp_synced_at, erp_sync_status, erp_sync_error, created_at
)
SELECT
    s.auth_user_id, s.email, 'active', 'cn_seller', s.seller_tier, s.company_name, s.contact_name, s.phone,
    s.erp_customer_id, s.erp_customer_level_id, s.erp_synced_at, s.erp_sync_status, s.erp_sync_error, s.created_at
FROM cn_sellers s
WHERE NOT EXISTS (SELECT 1 FROM creators c WHERE c.auth_user_id = s.auth_user_id);

INSERT INTO creator_profiles (creator_id, display_name)
SELECT c.id, c.company_name FROM creators c
WHERE c.user_type = 'cn_seller'
  AND NOT EXISTS (SELECT 1 FROM creator_profiles p WHERE p.creator_id = c.id);

-- 4. 可见性表的等级改从 creators 读；然后废弃 cn_sellers
DROP POLICY IF EXISTS "seller_product_visibility_select_own_tier" ON seller_product_visibility;
CREATE POLICY "seller_product_visibility_select_own_tier" ON seller_product_visibility
    FOR SELECT USING (
        is_admin()
        OR seller_tier = (SELECT seller_tier FROM creators WHERE auth_user_id = auth.uid())
    );

DROP TABLE IF EXISTS cn_sellers;

-- 5. 注册触发器：cn-portal 注册建 cn_seller 类型的 creator
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_creator_id UUID;
BEGIN
    IF NEW.raw_user_meta_data->>'signup_app' = 'cn_portal' THEN
        INSERT INTO public.creators (
            auth_user_id, email, status, user_type, seller_tier, company_name, contact_name, phone, erp_sync_status
        )
        VALUES (
            NEW.id,
            NEW.email,
            'active',
            'cn_seller',
            'CN_MERCHANT',
            COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'contact_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            'pending'
        )
        RETURNING id INTO new_creator_id;

        INSERT INTO public.creator_profiles (creator_id, display_name)
        VALUES (new_creator_id, COALESCE(NEW.raw_user_meta_data->>'company_name', ''));

        RETURN NEW;
    END IF;

    INSERT INTO public.creators (auth_user_id, email, status)
    VALUES (NEW.id, NEW.email, 'active')
    RETURNING id INTO new_creator_id;

    INSERT INTO public.creator_profiles (creator_id, display_name)
    VALUES (new_creator_id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 等级、类型、ERP 字段决定价格与身份：只能由 admin 或服务端密钥修改，
--    creators_update_own 仍允许用户改自己的其他字段。
CREATE OR REPLACE FUNCTION protect_creator_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() AND (
        NEW.user_type             IS DISTINCT FROM OLD.user_type
        OR NEW.seller_tier           IS DISTINCT FROM OLD.seller_tier
        OR NEW.erp_customer_id       IS DISTINCT FROM OLD.erp_customer_id
        OR NEW.erp_customer_level_id IS DISTINCT FROM OLD.erp_customer_level_id
        OR NEW.erp_synced_at         IS DISTINCT FROM OLD.erp_synced_at
        OR NEW.erp_sync_status       IS DISTINCT FROM OLD.erp_sync_status
        OR NEW.erp_sync_error        IS DISTINCT FROM OLD.erp_sync_error
    ) THEN
        RAISE EXCEPTION 'user_type, seller_tier and ERP sync fields can only be changed by an admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creators_protect_privileged_columns ON creators;
CREATE TRIGGER creators_protect_privileged_columns
    BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION protect_creator_privileged_columns();

-- 7. Admin 后台调整等级需要的写策略
DROP POLICY IF EXISTS "creators_admin_update" ON creators;
CREATE POLICY "creators_admin_update" ON creators
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
