-- ============================================================
-- Add user_type to creators table
-- Distinguishes Designer vs Distributor in the Portal
-- designer: sees My Designs module, can Request Promotion
-- distributor: no My Designs, can only build from Product Catalog
-- ============================================================

ALTER TABLE creators
ADD COLUMN user_type VARCHAR(20) DEFAULT 'designer'
    CHECK (user_type IN ('designer', 'distributor'));

-- Backfill existing creators as designers
UPDATE creators SET user_type = 'designer' WHERE user_type IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE creators ALTER COLUMN user_type SET NOT NULL;

CREATE INDEX idx_creators_user_type ON creators(user_type);
