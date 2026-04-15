-- ============================================================
-- Add design_artwork_urls to sellable_product_instances
-- Stores the actual design artwork images uploaded by the user
-- Separate from preview_urls which stores the composed mockup
-- ============================================================

ALTER TABLE sellable_product_instances
ADD COLUMN design_artwork_urls JSONB DEFAULT '[]';
