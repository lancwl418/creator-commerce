-- ============================================================
-- Creator Commerce: 招募管理
-- 支持 Instagram 等社交平台的创作者发现与招募
-- ============================================================

-- ============================================================
-- 1. 招募候选人表
-- ============================================================

CREATE TABLE recruitment_candidates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 社交平台信息
    platform            VARCHAR(30) NOT NULL,           -- 'instagram' / 'tiktok' / 'manual'
    platform_user_id    VARCHAR(200),                   -- 平台上的用户 ID
    platform_username   VARCHAR(200),                   -- 平台上的用户名
    profile_url         VARCHAR(500),                   -- 平台个人主页 URL
    avatar_url          VARCHAR(500),
    -- 基本信息
    display_name        VARCHAR(255),
    bio                 TEXT,
    email               VARCHAR(255),                   -- 手动录入或从平台获取
    -- 平台数据
    followers_count     INT,
    following_count     INT,
    posts_count         INT,
    engagement_rate     DECIMAL(5,4),                   -- 互动率 0.0350 = 3.5%
    -- 招募状态
    status              VARCHAR(30) DEFAULT 'discovered'
                        CHECK (status IN (
                            'discovered',       -- 发现
                            'shortlisted',      -- 入围候选
                            'contacted',        -- 已联系
                            'interested',       -- 有意向
                            'registered',       -- 已注册为 creator
                            'rejected',         -- 被拒绝/不合适
                            'no_response'       -- 无回复
                        )),
    -- 关联
    creator_id          UUID REFERENCES creators(id),   -- 如果已注册为 creator
    added_by            UUID REFERENCES admin_users(id),
    -- 标签与备注
    tags                TEXT[] DEFAULT '{}',
    notes               TEXT,
    -- 联系记录
    last_contacted_at   TIMESTAMPTZ,
    contact_count       INT DEFAULT 0,
    -- 时间戳
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recruitment_platform ON recruitment_candidates(platform, platform_username);
CREATE INDEX idx_recruitment_status ON recruitment_candidates(status);
CREATE UNIQUE INDEX idx_recruitment_unique_platform_user ON recruitment_candidates(platform, platform_user_id) WHERE platform_user_id IS NOT NULL;

CREATE TRIGGER recruitment_candidates_updated_at
    BEFORE UPDATE ON recruitment_candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. 招募联系记录表
-- ============================================================

CREATE TABLE recruitment_contact_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id            UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    contact_method          VARCHAR(30) NOT NULL,       -- 'email' / 'instagram_dm' / 'phone' / 'other'
    message_template        VARCHAR(100),               -- 使用的消息模板名
    message_content         TEXT,
    response                TEXT,
    contacted_by            UUID REFERENCES admin_users(id),
    contacted_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contact_logs_candidate ON recruitment_contact_logs(candidate_id);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recruitment_candidates_admin_all" ON recruitment_candidates
    FOR ALL USING (is_admin());

CREATE POLICY "recruitment_contact_logs_admin_all" ON recruitment_contact_logs
    FOR ALL USING (is_admin());
