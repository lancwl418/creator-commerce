-- Add option_names column to store ERP option names (e.g. ["Color", "Size"])
-- so they can be used when syncing to Shopify instead of generic "Option 1/2/3"
ALTER TABLE sellable_product_instances
  ADD COLUMN IF NOT EXISTS option_names JSONB DEFAULT '[]';
