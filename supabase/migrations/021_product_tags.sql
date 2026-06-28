-- Free-form product tags (also pushed to Shopify as the product's tags).
-- Stored as a JSONB array of strings, e.g. ["summer", "graphic-tee"].
ALTER TABLE sellable_product_instances
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
