-- ============================================================
-- 006: Add variant selection and pricing to sellable_product_instances
-- ============================================================

-- selected_skus: JSONB array of selected variants
-- Example: [
--   {"size": "S", "color": "Black", "enabled": true},
--   {"size": "M", "color": "Black", "enabled": true},
--   {"size": "L", "color": "Black", "enabled": false}
-- ]
ALTER TABLE sellable_product_instances
    ADD COLUMN IF NOT EXISTS selected_skus JSONB DEFAULT '[]';

-- retail_price: the creator's chosen selling price
ALTER TABLE sellable_product_instances
    ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2);

-- cost: production cost (hardcoded $10 for MVP)
ALTER TABLE sellable_product_instances
    ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 10.00;

-- erp_product_id: the actual ERP product ID (without 'erp-' prefix)
-- for fetching SKU data from ERP in the future
ALTER TABLE sellable_product_instances
    ADD COLUMN IF NOT EXISTS erp_product_id VARCHAR(100);
