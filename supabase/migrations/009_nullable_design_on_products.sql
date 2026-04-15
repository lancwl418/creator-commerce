-- ============================================================
-- Make design_id and design_version_id nullable on sellable_product_instances
-- Catalog flow creates products without a pre-existing design
-- (user uploads artwork directly in the Design Engine)
-- ============================================================

ALTER TABLE sellable_product_instances
ALTER COLUMN design_id DROP NOT NULL;

ALTER TABLE sellable_product_instances
ALTER COLUMN design_version_id DROP NOT NULL;
