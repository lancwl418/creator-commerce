-- ============================================================
-- 023: 中国卖家平台 · 产品模块 (v1)
-- 依据《中国卖家上架选品系统·产品模块 需求与技术方案 v1》第三节
--
-- 原则：产品主数据与价格来自 ERP，平台只读、不做本地全量副本。
-- 平台侧只落 3 张薄表：可见性、库存快照、起订量。
-- 键统一用 ERP 的 SKU 字符串（sku），不是 ERP 内部 uuid。
-- ============================================================

-- 卖家等级枚举：等级1→VIP，等级2→批发商（见文档 4.1）
DO $$ BEGIN
    CREATE TYPE cn_seller_tier AS ENUM ('VIP', 'WHOLESALE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 可见性控制 ──
-- 文档 4.2：第一版全部产品对两个等级开放，结构按分级设计，初始 visible = true。
-- 后期做「VIP 优先获得爆款」时改数据即可，不动结构。
CREATE TABLE IF NOT EXISTS seller_product_visibility (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku          TEXT NOT NULL,
    seller_tier  cn_seller_tier NOT NULL,
    visible      BOOLEAN NOT NULL DEFAULT true,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sku, seller_tier)
);
CREATE INDEX IF NOT EXISTS idx_spv_tier_visible
    ON seller_product_visibility (seller_tier, visible);

-- ── 库存快照 ──
-- 文档 4.4 / 6.4：每周同步一次，只存有货/无货布尔，不存数量。
-- 无货产品不出现在列表中（过滤在应用层做，后台仍可查）。
CREATE TABLE IF NOT EXISTS product_stock_snapshot (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku        TEXT NOT NULL UNIQUE,
    in_stock   BOOLEAN NOT NULL DEFAULT false,
    synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    source     TEXT                       -- 供应商标识
);
CREATE INDEX IF NOT EXISTS idx_pss_in_stock ON product_stock_snapshot (in_stock);

-- ── 起订量 (MOQ) ──
-- 文档 4.3：字段先录，不做校验；详情页展示提示文案（如「10 件起订」）。
CREATE TABLE IF NOT EXISTS product_moq (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         TEXT NOT NULL UNIQUE,
    min_qty     INTEGER,
    min_amount  DECIMAL(10,2),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注：卖家身份与 tier 由 ERP API 提供（见 lib/erp/seller.ts），
-- 因此平台侧不建 sellers 表；tier 运行时从 ERP 拉取后映射价格等级。
