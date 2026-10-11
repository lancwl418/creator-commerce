-- ============================================================
-- 026: 中国卖家账户（cn-portal 注册 / 登录）
--
-- cn-portal 与 Creator Portal 共用 Supabase Auth。此前 auth.users 的注册触发器
-- 会给每个新用户建一条 Creator 记录；这里让从 cn-portal 注册的用户只建
-- cn_sellers，不建 Creator 记录。
--
-- 依赖 025（cn_seller_tier 枚举里的 CN_MERCHANT）。
-- ============================================================

-- 卖家账户：与 auth.users 一一对应。
-- seller_tier 决定卖家看到的价格等级，新账户一律是 CN_MERCHANT，由运营调整。
-- 不设列默认值：025 新增的枚举值不能在同一个事务里被引用，等级由注册触发器写入。
CREATE TABLE IF NOT EXISTS cn_sellers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL,
    company_name     VARCHAR(255) NOT NULL DEFAULT '',
    contact_name     VARCHAR(100) NOT NULL DEFAULT '',
    phone            VARCHAR(50)  NOT NULL DEFAULT '',
    seller_tier      cn_seller_tier NOT NULL,
    -- ERP 对接口：对接后回写 ERP 客户档案 id；目前不对接，保持为空
    erp_customer_id  TEXT,
    erp_synced_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS cn_sellers_updated_at ON cn_sellers;
CREATE TRIGGER cn_sellers_updated_at
    BEFORE UPDATE ON cn_sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 卖家只能读自己的账户。不开放写入：等级决定价格，不能由卖家自己改；
-- 建账户由下面的触发器完成，等级调整和 ERP 回写走服务端密钥。
ALTER TABLE cn_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cn_sellers_select_own" ON cn_sellers;
CREATE POLICY "cn_sellers_select_own" ON cn_sellers
    FOR SELECT USING (auth_user_id = auth.uid());

-- 注册触发器：cn-portal 注册时带 signup_app = 'cn_portal'，只建卖家账户；
-- 其余注册保持原行为（建 Creator + profile）。
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_creator_id UUID;
BEGIN
    IF NEW.raw_user_meta_data->>'signup_app' = 'cn_portal' THEN
        INSERT INTO public.cn_sellers (auth_user_id, email, company_name, contact_name, phone, seller_tier)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'contact_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            'CN_MERCHANT'
        );
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
