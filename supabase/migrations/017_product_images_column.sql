-- Store ERP product-level images for selection during sync
-- e.g. [{"id":"img1","url":"/api/erp-image?path=...","rawPath":"xxx.jpg","isMain":true}]
ALTER TABLE sellable_product_instances
  ADD COLUMN IF NOT EXISTS product_images JSONB DEFAULT '[]';
