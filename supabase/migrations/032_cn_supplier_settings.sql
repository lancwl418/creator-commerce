-- ============================================================
-- 032: cn-portal 供应商显示名设置 + 平台管理员账号
--
-- ERP 产品带默认供应商（mainSupplierId / vendor）。cn-portal 目录按默认供应商筛选和标注产品，
-- 供应商对卖家展示的名称可由管理员自定义；没有自定义时显示 ERP 原名。
-- 管理员 = admin_users 里 status=active 的用户（is_admin()，见 005），同时也是一个 cn_seller，
-- 这样能用同一套登录进 cn-portal。
-- ============================================================

CREATE TABLE IF NOT EXISTS cn_supplier_settings (
    -- ERP 供应商 id（products.mainSupplierId / suppliers[].supplierId）
    supplier_id     TEXT PRIMARY KEY,
    -- 保存时 ERP 的原名，便于后台对照；展示以 display_name 为准
    original_name   TEXT NOT NULL DEFAULT '',
    display_name    TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS cn_supplier_settings_updated_at ON cn_supplier_settings;
CREATE TRIGGER cn_supplier_settings_updated_at
    BEFORE UPDATE ON cn_supplier_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cn_supplier_settings ENABLE ROW LEVEL SECURITY;

-- 登录用户都能读（目录要用显示名）；只有管理员能写
DROP POLICY IF EXISTS "cn_supplier_settings_select_authenticated" ON cn_supplier_settings;
CREATE POLICY "cn_supplier_settings_select_authenticated" ON cn_supplier_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cn_supplier_settings_admin_write" ON cn_supplier_settings;
CREATE POLICY "cn_supplier_settings_admin_write" ON cn_supplier_settings
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 平台管理员账号：用户名 admin / 密码 admin12345
-- 登录页输入不带 @ 的用户名时，程序会补成 <用户名>@cn-portal.local（见 lib/sellers/login-identifier.ts），
-- 所以这里建的邮箱是 admin@cn-portal.local。上线后请改掉密码。
-- ------------------------------------------------------------
DO $$
DECLARE
    v_email   TEXT := 'admin@cn-portal.local';
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        -- 带 signup_app=cn_portal 的元数据，handle_new_user 触发器会顺带建 cn_seller 的 creators 记录
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change, is_sso_user
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
            extensions.crypt('admin12345', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('signup_app', 'cn_portal', 'company_name', 'Admin', 'contact_name', 'admin', 'phone', ''),
            now(), now(), '', '', '', '', false
        );
        INSERT INTO auth.identities (
            id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id, v_user_id::text, 'email',
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
            now(), now(), now()
        );
    END IF;

    -- 用户已存在但没有卖家记录时补一条（触发器只在新建用户时跑）
    INSERT INTO creators (auth_user_id, email, status, user_type, seller_tier, company_name, contact_name, phone, erp_sync_status)
    SELECT v_user_id, v_email, 'active', 'cn_seller', 'CN_MERCHANT', 'Admin', 'admin', '', 'pending'
    WHERE NOT EXISTS (SELECT 1 FROM creators WHERE auth_user_id = v_user_id);

    INSERT INTO admin_users (auth_user_id, email, name, role, status)
    VALUES (v_user_id, v_email, 'admin', 'admin', 'active')
    ON CONFLICT (auth_user_id) DO UPDATE SET status = 'active', role = 'admin';
END $$;
