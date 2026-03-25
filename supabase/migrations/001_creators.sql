-- ============================================================
-- Creator Commerce: Creator 身份与 Profile
-- Supabase Auth 管理认证，此表管理业务数据
-- ============================================================

-- creators: 与 auth.users 一一对应
CREATE TABLE creators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    erp_partner_id  UUID,                       -- 对应 ERP partners 表，首次发布产品时懒创建
    email           VARCHAR(255) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
    onboarding_step VARCHAR(30) DEFAULT 'profile'
                    CHECK (onboarding_step IN ('profile', 'completed')),
    agreed_terms_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_creators_auth_user ON creators(auth_user_id);
CREATE INDEX idx_creators_erp_partner ON creators(erp_partner_id);

-- creator_profiles
CREATE TABLE creator_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID UNIQUE NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    display_name    VARCHAR(100) NOT NULL DEFAULT '',
    slug            VARCHAR(100) UNIQUE,
    bio             TEXT DEFAULT '',
    avatar_url      VARCHAR(500),
    banner_url      VARCHAR(500),
    social_links    JSONB DEFAULT '{}',
    country         VARCHAR(2),
    timezone        VARCHAR(50),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 自动创建 creator + profile 当用户注册时
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_creator_id UUID;
BEGIN
    INSERT INTO creators (auth_user_id, email, status)
    VALUES (NEW.id, NEW.email, 'active')
    RETURNING id INTO new_creator_id;

    INSERT INTO creator_profiles (creator_id, display_name)
    VALUES (new_creator_id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 自动更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at
    BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER creator_profiles_updated_at
    BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: 按 creator 隔离数据
-- ============================================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- creators: 用户只能读自己的记录
CREATE POLICY "creators_select_own" ON creators
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "creators_update_own" ON creators
    FOR UPDATE USING (auth_user_id = auth.uid());

-- creator_profiles: 用户只能读写自己的 profile
CREATE POLICY "profiles_select_own" ON creator_profiles
    FOR SELECT USING (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "profiles_update_own" ON creator_profiles
    FOR UPDATE USING (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );
