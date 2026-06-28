-- Per-product shipping cost, subtracted from profit on the Price step.
ALTER TABLE sellable_product_instances
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;
