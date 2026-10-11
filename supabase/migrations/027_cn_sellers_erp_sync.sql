-- ============================================================
-- 027: 卖家账户 → ERP 客户档案的同步状态
--
-- 注册时按卖家等级在 ERP 客户等级列表里找到对应等级，创建 ERP 客户并回写 id。
-- 同步失败（例如 appKey 未获授权）不影响注册，状态记为 failed，登录时重试。
-- ============================================================

ALTER TABLE cn_sellers
    ADD COLUMN IF NOT EXISTS erp_customer_level_id TEXT,
    ADD COLUMN IF NOT EXISTS erp_sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (erp_sync_status IN ('pending', 'synced', 'failed')),
    ADD COLUMN IF NOT EXISTS erp_sync_error TEXT;

UPDATE cn_sellers SET erp_sync_status = 'synced' WHERE erp_customer_id IS NOT NULL;
