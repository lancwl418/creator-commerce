---
name: 数据模型差距分析（路线图 vs 当前 Schema）
updated: 2026-03-27
---

## 核心发现

当前 Schema（migrations 000-004）是 **creator 自助流** 设计的，但路线图 MVP 要求的是 **运营驱动流**。
缺少整个 Admin 运营层的数据结构。

## 差距总览（2026-03-27 已通过 005_admin_operations.sql 解决）

| 需求 | 状态 | Migration |
|------|------|-----------|
| 选品决策记录表 | ✅ `product_selection_decisions` | 005 |
| 风格标签/主色调/目标人群 | ✅ `designs` 新增 style_tags/color_palette/target_audience | 005 |
| 文件质量检测记录 | ✅ `design_asset_quality_checks` | 005 |
| Mockup 双轨制 | ✅ `preview_assets` 新增 preview_purpose/is_ad_grade/uploaded_by | 005 |
| 上架运营追踪 | ✅ `listing_performance_reviews` | 005 |
| Admin 用户体系 | ✅ `admin_users` + `is_admin()` helper | 005 |
| 运营配置 | ✅ `operating_config` + 初始数据 | 005 |

## 已有 Schema 做得好的部分

- creators + creator_profiles（身份与资料）
- designs + design_versions + design_assets（设计上传与版本管理）
- design_tags（自由标签，但不够结构化）
- sellable_product_instances + product_configurations（产品实例与设计配置）
- channel_listings + sync_jobs + publishing_records（渠道分发全链路）
- creator_earnings_summary（收入聚合缓存）
- RLS 策略完整（creator 只能看自己的数据）

## 需要新增的表

### 1. admin_product_selection_decisions（选品决策记录 — 最核心）

路线图的"数据地基"。每次运营选品必须记录，不可跳过。

```sql
CREATE TABLE admin_product_selection_decisions (
    id                      UUID PRIMARY KEY,
    design_id               UUID NOT NULL REFERENCES designs(id),
    creator_id              UUID NOT NULL REFERENCES creators(id),
    -- 审核
    reviewer_id             UUID,                   -- Admin user
    reviewed_at             TIMESTAMPTZ,
    quality_status          VARCHAR(20),            -- pass / needs_revision / rejected
    quality_notes           TEXT,
    -- 选品决策
    recommended_template_1  UUID,                   -- 第一优先产品模板（ERP ID）
    recommended_template_2  UUID,                   -- 第二优先
    recommendation_reason   TEXT,
    not_recommended         JSONB DEFAULT '{}',     -- {template_id: reason}
    price_suggestion_min    DECIMAL(10,2),
    price_suggestion_max    DECIMAL(10,2),
    -- 决策元数据
    decision_status         VARCHAR(20) DEFAULT 'pending',  -- pending/approved/published/archived
    decided_by              UUID,
    decided_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
```

### 2. design_asset_quality_checks（文件质量检测记录）

```sql
CREATE TABLE design_asset_quality_checks (
    id                  UUID PRIMARY KEY,
    design_asset_id     UUID NOT NULL REFERENCES design_assets(id),
    inspector_id        UUID,
    checked_at          TIMESTAMPTZ DEFAULT now(),
    -- 检测项
    dpi_value           INT,
    dpi_valid           BOOLEAN,
    color_mode          VARCHAR(20),    -- RGB / CMYK / GRAY
    color_mode_valid    BOOLEAN,
    dimensions_valid    BOOLEAN,
    -- 总结
    quality_status      VARCHAR(20),    -- pass / warning / fail
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 3. listing_performance_reviews（上架运营追踪）

```sql
CREATE TABLE listing_performance_reviews (
    id                      UUID PRIMARY KEY,
    channel_listing_id      UUID NOT NULL REFERENCES channel_listings(id),
    review_period_start     TIMESTAMPTZ,
    review_period_end       TIMESTAMPTZ,
    -- KPI
    view_count              INT DEFAULT 0,
    add_to_cart_count       INT DEFAULT 0,
    purchase_count          INT DEFAULT 0,
    gmv_total               DECIMAL(10,2) DEFAULT 0,
    cart_add_rate           DECIMAL(5,4),   -- 小数
    conversion_rate         DECIMAL(5,4),
    -- 复盘
    review_conclusion       VARCHAR(30),    -- continue / adjust_price / change_product / delist
    review_notes            TEXT,
    reviewer_id             UUID,
    reviewed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now()
);
```

### 4. admin_users（Admin 用户）

```sql
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY,
    auth_user_id    UUID UNIQUE NOT NULL,   -- Supabase auth.users
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(100),
    role            VARCHAR(50) NOT NULL,   -- reviewer / operator / admin
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 5. operating_config（运营配置，非 MVP 阻塞）

```sql
CREATE TABLE operating_config (
    id              UUID PRIMARY KEY,
    config_key      VARCHAR(100) UNIQUE NOT NULL,
    config_value    JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID,
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

## 需要扩展的现有表

### designs 表 — 增加结构化元数据

```sql
ALTER TABLE designs ADD COLUMN style_tags TEXT[] DEFAULT '{}';
ALTER TABLE designs ADD COLUMN primary_color VARCHAR(50);
ALTER TABLE designs ADD COLUMN target_audience TEXT;
```

当前 design_tags 是自由文本标签。路线图需要的"风格标签"是**预定义枚举多选**（极简/波普/插画/文字类/自然系/暗黑系/复古/卡通/几何），应该用 TEXT[] 在 designs 表上直接存，比 design_tags 更适合结构化查询。

### preview_assets 表 — 增加用途区分

```sql
ALTER TABLE preview_assets ADD COLUMN preview_purpose VARCHAR(30) DEFAULT 'preview';
    -- preview / marketing
ALTER TABLE preview_assets ADD COLUMN is_ad_grade BOOLEAN DEFAULT FALSE;
ALTER TABLE preview_assets ADD COLUMN uploaded_by VARCHAR(30) DEFAULT 'system';
    -- system / admin
```

## 流程差异

### 当前 Schema 支持的流（Creator 自助）
```
Creator 上传 design → 自己选模板 → 自己编辑 → 自己定价 → 自己发布
```

### 路线图 MVP 需要的流（运营驱动）
```
Creator 上传 design
  → Admin 审核 + 打标签（风格/主色调/人群）
  → Admin 文件质检（DPI/色彩/尺寸）
  → Admin 选品决策（推荐产品+定价建议）
  → 系统/Admin 创建产品实例 + listing
  → 上架后追踪 30天 KPI
  → Admin 复盘：继续/调整/下架
```

## RLS 影响

新增的 Admin 表需要不同的 RLS 策略：
- Admin 表应允许 admin_users 角色的用户访问所有数据
- 需要一个 `is_admin()` 辅助函数
- 现有 creator 表的 RLS 可能需要加 admin 可读的策略
