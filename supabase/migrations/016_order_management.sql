-- Order management: audit logs, fulfillment tracking, manual edit support

-- Audit log for all order changes (automatic and manual)
CREATE TABLE creator_order_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_order_id    UUID NOT NULL REFERENCES creator_orders(id) ON DELETE CASCADE,
    action              VARCHAR(30) NOT NULL
                        CHECK (action IN (
                          'created', 'updated', 'cancelled', 'fulfilled',
                          'items_changed', 'manual_edit', 'erp_synced',
                          'shipping_updated', 'customer_updated', 'refunded'
                        )),
    source              VARCHAR(20) NOT NULL
                        CHECK (source IN ('shopify_webhook', 'manual', 'system', 'erp')),
    changes             JSONB DEFAULT '{}',
    note                TEXT,
    created_by          UUID,  -- auth user id for manual edits, null for system/webhook
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_logs_order ON creator_order_logs(creator_order_id);
CREATE INDEX idx_order_logs_action ON creator_order_logs(action);

-- Add fields to creator_orders for fulfillment and ERP sync
ALTER TABLE creator_orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS erp_order_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS erp_sync_status VARCHAR(20) DEFAULT 'pending'
    CHECK (erp_sync_status IN ('pending', 'synced', 'error', 'cancelled')),
  ADD COLUMN IF NOT EXISTS erp_synced_at TIMESTAMPTZ;

-- Fulfillment tracking per order
CREATE TABLE creator_order_fulfillments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_order_id    UUID NOT NULL REFERENCES creator_orders(id) ON DELETE CASCADE,
    shopify_fulfillment_id VARCHAR(100),
    tracking_number     VARCHAR(255),
    tracking_url        VARCHAR(500),
    carrier             VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'shipped', 'delivered', 'failed')),
    line_item_ids       JSONB DEFAULT '[]',  -- which line items are fulfilled
    fulfilled_at        TIMESTAMPTZ,
    pushed_to_shopify   BOOLEAN DEFAULT false,
    pushed_to_erp       BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fulfillments_order ON creator_order_fulfillments(creator_order_id);

CREATE TRIGGER fulfillments_updated_at
    BEFORE UPDATE ON creator_order_fulfillments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE creator_order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_order_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_logs_select_own" ON creator_order_logs
    FOR SELECT USING (
        creator_order_id IN (SELECT id FROM creator_orders WHERE creator_id = get_my_creator_id())
    );

CREATE POLICY "fulfillments_select_own" ON creator_order_fulfillments
    FOR SELECT USING (
        creator_order_id IN (SELECT id FROM creator_orders WHERE creator_id = get_my_creator_id())
    );
