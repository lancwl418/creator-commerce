-- Creator orders received from Shopify webhooks

CREATE TABLE creator_orders (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                  UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    creator_store_connection_id UUID NOT NULL REFERENCES creator_store_connections(id),
    shopify_order_id            VARCHAR(100) NOT NULL,
    shopify_order_number        VARCHAR(100),
    shopify_order_name          VARCHAR(255),
    financial_status            VARCHAR(30),
    fulfillment_status          VARCHAR(30),
    total_price                 DECIMAL(10,2),
    subtotal_price              DECIMAL(10,2),
    total_tax                   DECIMAL(10,2),
    currency                    VARCHAR(3) DEFAULT 'USD',
    customer_email              VARCHAR(255),
    customer_name               VARCHAR(255),
    shipping_address            JSONB DEFAULT '{}',
    order_placed_at             TIMESTAMPTZ,
    metadata                    JSONB DEFAULT '{}',
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shopify_order_id, creator_store_connection_id)
);

CREATE INDEX idx_creator_orders_creator ON creator_orders(creator_id);
CREATE INDEX idx_creator_orders_connection ON creator_orders(creator_store_connection_id);
CREATE INDEX idx_creator_orders_shopify_id ON creator_orders(shopify_order_id);

CREATE TRIGGER creator_orders_updated_at
    BEFORE UPDATE ON creator_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE creator_order_items (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_order_id            UUID NOT NULL REFERENCES creator_orders(id) ON DELETE CASCADE,
    channel_listing_variant_id  UUID REFERENCES channel_listing_variants(id),
    shopify_line_item_id        VARCHAR(100),
    shopify_variant_id          VARCHAR(100),
    shopify_product_id          VARCHAR(100),
    title                       VARCHAR(500),
    variant_title               VARCHAR(255),
    sku                         VARCHAR(255),
    quantity                    INT NOT NULL DEFAULT 1,
    unit_price                  DECIMAL(10,2),
    total_price                 DECIMAL(10,2),
    sale_price_snapshot         DECIMAL(10,2),
    base_cost_snapshot          DECIMAL(10,2),
    earnings_amount             DECIMAL(10,2),
    created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_creator_order_items_order ON creator_order_items(creator_order_id);
CREATE INDEX idx_creator_order_items_variant ON creator_order_items(shopify_variant_id);

-- RLS
ALTER TABLE creator_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON creator_orders
    FOR SELECT USING (creator_id = get_my_creator_id());

CREATE POLICY "order_items_select_own" ON creator_order_items
    FOR SELECT USING (
        creator_order_id IN (SELECT id FROM creator_orders WHERE creator_id = get_my_creator_id())
    );

-- Service role can insert/update (webhook handler bypasses RLS)
