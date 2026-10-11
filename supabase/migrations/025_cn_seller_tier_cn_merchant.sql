-- ============================================================
-- 025: 卖家等级枚举增加 CN_MERCHANT
--
-- 中国卖家归 ERP 客户等级「中国商家」。cn-portal 按当前等级查询
-- seller_product_visibility.seller_tier，枚举里没有这个值时查询会直接报错，
-- 所以必须先执行本 migration，再部署使用 CN_MERCHANT 的 cn-portal。
-- ============================================================

ALTER TYPE cn_seller_tier ADD VALUE IF NOT EXISTS 'CN_MERCHANT';
