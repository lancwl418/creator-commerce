-- ============================================================
-- 037: 补齐工厂 ↔ ERP 供应商映射
--
-- 2026-11-06 从 ERP 目录核对（全量产品的 suppliers[]）：
--   鑫飞扬美履 2074886351039840257 → xinfeiyang（RIIN）
--   林淼独立站 2062181486366932993 → linmiao
-- 其余 ERP 供应商（ai定制 / 育创谷厦门工厂 / 休斯敦工厂）没有对接的工厂系统，
-- 对应产品的采购单推送时会明确报「无工厂映射」。
-- ============================================================

UPDATE cn_factory_suppliers SET erp_supplier_id = '2074886351039840257'
WHERE key = 'xinfeiyang' AND erp_supplier_id IS NULL;

UPDATE cn_factory_suppliers SET erp_supplier_id = '2062181486366932993'
WHERE key = 'linmiao' AND erp_supplier_id IS NULL;
