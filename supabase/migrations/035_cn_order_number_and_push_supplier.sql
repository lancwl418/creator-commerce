-- ============================================================
-- 035: 采购单订单号（CN1000 起）+ 推送工厂预选
--
-- order_number：对内/对外展示用的递增单号，界面显示为 CN<number>（如 CN1000）。
-- push_suppliers：推送 ERP 前运营的工厂预选，按产品记录
--   { "<erp_product_id>": { "supplier_id": "...", "supplier_name": "...", "quote_id": "..." } }
--   未选择的产品推送时用下单快照的默认供应商（items[].supplier_name）。
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS cn_bulk_orders_order_number_seq START WITH 1000;

ALTER TABLE cn_bulk_orders ADD COLUMN IF NOT EXISTS order_number BIGINT;

-- 回填已有订单：按下单时间从 1000 起编号
WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
    FROM cn_bulk_orders
    WHERE order_number IS NULL
)
UPDATE cn_bulk_orders o
SET order_number = 999 + ordered.rn
FROM ordered
WHERE o.id = ordered.id;

-- 序列跳过已回填的号段
SELECT setval(
    'cn_bulk_orders_order_number_seq',
    GREATEST(1000, (SELECT COALESCE(MAX(order_number), 999) FROM cn_bulk_orders) + 1),
    false
);

ALTER TABLE cn_bulk_orders ALTER COLUMN order_number SET DEFAULT nextval('cn_bulk_orders_order_number_seq');
ALTER TABLE cn_bulk_orders ALTER COLUMN order_number SET NOT NULL;
ALTER SEQUENCE cn_bulk_orders_order_number_seq OWNED BY cn_bulk_orders.order_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cn_bulk_orders_order_number ON cn_bulk_orders (order_number);

-- 推送工厂预选（仅运营可写，走已有的 cn_bulk_orders_admin_update 策略）
ALTER TABLE cn_bulk_orders ADD COLUMN IF NOT EXISTS push_suppliers JSONB NOT NULL DEFAULT '{}'::jsonb;
