-- Step 3 (option A): sync Shopify (ghostyle) customers ↔ Creator Commerce.
-- The customers/create webhook stages incoming Shopify customers here; when a
-- person later registers on Creator Commerce with the same email, their creator
-- record is linked to the Shopify customer id (and vice-versa via webhook back-fill).

-- Staging table for Shopify customers seen via webhook (pre-registration).
CREATE TABLE IF NOT EXISTS shopify_customers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_customer_id  TEXT UNIQUE NOT NULL,
    email                TEXT,
    first_name           TEXT,
    last_name            TEXT,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email ON shopify_customers (lower(email));

-- Locked down: only the service role (webhook) and SECURITY DEFINER trigger touch it.
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;

-- Link column on creators.
ALTER TABLE creators ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;

-- When a creator row is inserted (e.g. on signup via handle_new_user), link it
-- to a previously-staged Shopify customer with the same email. Additive — does
-- not modify the auth trigger.
CREATE OR REPLACE FUNCTION link_shopify_customer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shopify_customer_id IS NULL AND NEW.email IS NOT NULL THEN
        NEW.shopify_customer_id := (
            SELECT shopify_customer_id FROM shopify_customers
            WHERE lower(email) = lower(NEW.email)
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_creator_created_link_shopify ON creators;
CREATE TRIGGER on_creator_created_link_shopify
    BEFORE INSERT ON creators
    FOR EACH ROW EXECUTE FUNCTION link_shopify_customer();
