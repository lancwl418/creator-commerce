-- ============================================================
-- 039: Admin 后台界面语言（中 / 英）
--
-- 每个后台账号记住自己的界面语言：登录后按 admin_users.locale 显示，
-- 在页面顶部切换后写回这里。默认英文；info@idea-max.com（wesley）默认中文。
-- ============================================================

ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'zh'));

UPDATE admin_users SET locale = 'zh' WHERE email = 'info@idea-max.com';

-- 后台用户只改自己的语言（不放开 admin_users 的其它列）
CREATE OR REPLACE FUNCTION set_my_admin_locale(p_locale TEXT)
RETURNS VOID AS $$
BEGIN
    IF p_locale NOT IN ('en', 'zh') THEN
        RAISE EXCEPTION 'Unsupported locale %', p_locale;
    END IF;
    UPDATE admin_users SET locale = p_locale WHERE auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION set_my_admin_locale(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_my_admin_locale(TEXT) TO authenticated;
