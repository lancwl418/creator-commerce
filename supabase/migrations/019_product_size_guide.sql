-- Per-product size guide table, shown on the product Detail step.
-- Shape: { "headers": ["Size", "Chest (in)", "Length (in)"],
--          "rows": [["S", "18", "28"], ["M", "20", "29"]] }
ALTER TABLE sellable_product_instances
  ADD COLUMN IF NOT EXISTS size_guide JSONB DEFAULT NULL;
