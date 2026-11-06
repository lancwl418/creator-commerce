-- ============================================================
-- 036: 采购单直推工厂（RIIN / Linmiao）
--
-- cn_factory_suppliers：工厂接入配置 + ERP 供应商映射。密钥不落库，
--   secret_key_env 存环境变量名（同 order-workbench 的做法）。
-- cn_factory_pushes：每次成功下到工厂一条记录（platform_oid 唯一防重复推）；
--   下单失败不落库，错误直接返回界面可重试。
-- 推送时机：只下单到工厂系统的「待推送」状态（RIIN placeOrder 不 pushOrder；
--   Linmiao create-order 本身就停在待推送，面单要在其后台传）。
-- ============================================================

CREATE TABLE IF NOT EXISTS cn_factory_suppliers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ERP suppliers[].supplierId / products.mainSupplierId；null = 还没对上 ERP 供应商
    erp_supplier_id  TEXT UNIQUE,
    key              TEXT NOT NULL UNIQUE,         -- jjspromo / xinfeiyang / linmiao
    name             TEXT NOT NULL,
    adapter_type     TEXT NOT NULL CHECK (adapter_type IN ('riin', 'linmiao')),
    base_url         TEXT,                          -- 空时用 RIIN_API_URL / FACTORY_API_URL
    console_url      TEXT,                          -- 工厂后台地址，界面上链出去用
    secret_key_env   TEXT NOT NULL,                 -- 密钥所在环境变量名
    platform_type    INTEGER NOT NULL DEFAULT 15,
    enabled          BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS cn_factory_suppliers_updated_at ON cn_factory_suppliers;
CREATE TRIGGER cn_factory_suppliers_updated_at
    BEFORE UPDATE ON cn_factory_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cn_factory_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cn_factory_suppliers_admin" ON cn_factory_suppliers;
CREATE POLICY "cn_factory_suppliers_admin" ON cn_factory_suppliers
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 同 order-workbench 的三家工厂；JJS 的 ERP 供应商 id 先对上（2026-11-06 确认）
INSERT INTO cn_factory_suppliers (erp_supplier_id, key, name, adapter_type, secret_key_env, console_url)
VALUES
    ('2073060517085790210', 'jjspromo', 'JJSPROMO', 'riin', 'RIIN_JJSPROMO_SECRET_KEY', 'https://tshirt.riin.com/'),
    (NULL, 'xinfeiyang', 'Xinfeiyang', 'riin', 'RIIN_XINFEIYANG_SECRET_KEY', 'https://tshirt.riin.com/'),
    (NULL, 'linmiao', 'Linmiao', 'linmiao', 'FACTORY_API_SECRET_KEY', 'https://linmiao.online/')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS cn_factory_pushes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES cn_bulk_orders(id) ON DELETE CASCADE,
    factory_supplier_id UUID NOT NULL REFERENCES cn_factory_suppliers(id),
    -- 推给工厂的单号：CN<order_number>-<factory key>，工厂后台可按此查单
    platform_oid        TEXT NOT NULL UNIQUE,
    -- 本次推送包含 order.items 的哪些下标
    item_indexes        INTEGER[] NOT NULL DEFAULT '{}',
    placed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- RIIN pushOrder 推进工厂生产的时间；只下单到待推送时为空
    pushed_at           TIMESTAMPTZ,
    -- 工厂侧状态（RIIN enum：1 店铺审核 3 反审回电商 4 工厂审核 5 生产中 12 已发货 13 已关闭 15 已退款）
    order_status        INTEGER,
    order_status_str    TEXT,
    status_synced_at    TIMESTAMPTZ,
    tracking_number     TEXT,
    carrier             TEXT,
    waybill_url         TEXT,
    shipped_at          TIMESTAMPTZ,
    last_error          TEXT,
    request_payload     JSONB,
    trace_id            TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cn_factory_pushes_order ON cn_factory_pushes (order_id, created_at DESC);

DROP TRIGGER IF EXISTS cn_factory_pushes_updated_at ON cn_factory_pushes;
CREATE TRIGGER cn_factory_pushes_updated_at
    BEFORE UPDATE ON cn_factory_pushes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cn_factory_pushes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cn_factory_pushes_admin" ON cn_factory_pushes;
CREATE POLICY "cn_factory_pushes_admin" ON cn_factory_pushes
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
