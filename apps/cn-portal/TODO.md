# cn-portal 待办

> 中国卖家平台选品产品模块 v1。依据《中国卖家上架选品系统·产品模块 需求与技术方案 v1》。
> 已完成：app 骨架、选品列表页、详情页、ERP 分级取价（解析 pricingGroups）、3 张平台表、Docker/Render 部署配置。

## 一、待业务确认（阻塞取价准确性）

- [ ] **选品展示价口径**：当前算「空白衣售价 + 单面 face_1 印花售价」，按等级组名（VIP/批发）匹配。
      样本数据 blankPrice 全为 0，无法从数据反推，需确认：是否只算空白衣价 / 是否含双面 face_2。
      影响验收 #2（价格与 ERP 逐项一致）。见 `packages/shared/src/erp/pricing.ts`。
- [ ] **是否对卖家展示供应商名称**（文档待确认 #4）：当前默认不展示。关系平台价值/绕过风险。
- [ ] **起订量是否启用下单校验**（文档待确认 #6）：当前只录字段、只提示、不拦截。

## 二、待接入（工程）

- [ ] **卖家 auth + ERP 真实 tier 解析**：把 `src/lib/seller.ts` 里的 cookie 占位（`cn_seller_tier`）
      换成「登录 → 调 ERP customer 接口读价格等级 → 映射 SellerTier」。
- [ ] **详情页 variant 精确价**：当前列表/详情用等级价格区间（min–max 起价）；
      详情页按具体尺码档 + 颜色档精确到每个 variant。需按 SKU 的 option(color/size)
      匹配 pricingTiers/colorTiers/printPriceJson 的色档 ct 与尺码档。
- [ ] **下单 / 购物车模块**：详情页「加入购物车」现为占位（`AddToCart.tsx`）。
- [ ] **后台缺价清单页**：`buildCatalog` 已产出 `missingPriceProducts`，需一个运营可见的清单页
      （文档 4.1：让运营知道哪些产品因缺价没上架）。
- [ ] **库存人工导入界面**：每周运营导出供应商库存表上传，按 SKU 更新 `product_stock_snapshot`
      （文档 6.4 / 4.4）。API 确认可用后可换定时任务。

## 三、可选优化

- [ ] **creator portal 迁移到共享 ERP client**：creator portal 仍带一份早于 `packages/shared` 的
      ERP 路由和 ErpProduct 类型，long-term 迁入 `packages/shared/erp` 消除重复（会动现有 portal，有风险，不急）。
- [ ] **列表跨页筛选**：当前 category/价格筛选在已取回的 ERP 单页内进行（沿用 portal 做法）。
      如需全量筛选，待 ERP 提供带筛选参数的产品接口。
