# cn-portal 待办

> 中国卖家平台选品产品模块 v1。依据《中国卖家上架选品系统·产品模块 需求与技术方案 v1》。
> 已完成：app 骨架、选品列表页、详情页、ERP 分级取价（解析 pricingGroups）、3 张平台表、Docker/Render 部署配置。

## 一、待业务确认（阻塞取价准确性）

- [ ] **选品展示价口径**：当前算「空白衣售价 + 单面 face_1 印花售价」，按等级组名（VIP/批发）匹配。
      样本数据 blankPrice 全为 0，无法从数据反推，需确认：是否只算空白衣价 / 是否含双面 face_2。
      影响验收 #2（价格与 ERP 逐项一致）。见 `packages/shared/src/erp/pricing.ts`。
- [ ] **是否对卖家展示供应商名称**（文档待确认 #4）：当前默认不展示。关系平台价值/绕过风险。
- [ ] **起订量是否启用下单校验**（文档待确认 #6）：当前只录字段、只提示、不拦截。

- [ ] **哪些 ERP 产品状态可以给卖家看**：目录目前不按状态过滤，ERP 里的草稿（status=0）、
      审批中（1）、通过（2）都会显示。需确认只展示哪些状态 / 是否按 shelfStatus 过滤。
- [ ] **是否用 ERP 的「中国商家」客户等级和 `chinamerchant` 业务线**：ERP 已有客户等级
      「中国商家」和业务线 `chinamerchant`（商品字段 prodSupport），但定价分组目前只有
      零售 / 批发 / VIP。需确认卖家等级沿用 VIP / 批发，还是改用「中国商家」，以及目录是否
      只展示 prodSupport 含 `chinamerchant` 的产品。

## 二、待接入（工程）

- [x] **应用 migration 023 / 024**：2026-10-06 已在生产库执行。024 为三张表开启 RLS、只开放读取，
      写入需走服务端密钥。注意 `_migrations` 里没有 020–022 的记录（它们已手动应用），
      直接跑 `pnpm db:migrate` 会重跑这三个，执行前先看 `pnpm db:status`。
- [ ] **上线前访问控制**：当前 cookie 可由访问者修改，默认 VIP 也不是认证结果，不能作为
      生产价格权限来源。接入真实身份后，删除 cookie/default 占位。三张表的 RLS 已由 migration 024 开启
      （任何人可读、仅服务端密钥可写）；可见性表目前所有等级的行都可读，接入身份后按等级收紧。
- [ ] **卖家 auth + ERP 真实 tier 解析**：把 `src/lib/seller.ts` 里的 cookie 占位（`cn_seller_tier`）
      换成「登录 → 调 ERP customer 接口读价格等级 → 映射 SellerTier」。
      ERP 已提供客户档案分页接口（`UmrAedIA`，含 custStageId / vipStage）和客户等级分页接口（`wfi8Vrp4`）；
      等级匹配建议同时改为按 `pricingGroups[].customerLevelId`，不再按分组名称。
- [ ] **详情页 variant 精确价**：当前列表/详情用等级价格区间（min–max 起价）；
      详情页按具体尺码档 + 颜色档精确到每个 variant。需按 SKU 的 option(color/size)
      匹配 pricingTiers/colorTiers/printPriceJson 的色档 ct 与尺码档。
- [ ] **下单 / 购物车模块**：详情页「加入购物车」现为占位（`AddToCart.tsx`）。
- [ ] **后台缺价清单页**：`buildCatalog` 已产出 `missingPriceProducts`，需一个运营可见的清单页
      （文档 4.1：让运营知道哪些产品因缺价没上架）。
- [ ] **库存人工导入界面**：每周运营导出供应商库存表上传，按 SKU 更新 `product_stock_snapshot`
      （文档 6.4 / 4.4）。API 确认可用后可换定时任务。

## 三、可选优化

- [x] **ERP 请求与图片代理复用**：CN Portal / Creator Portal / Design Engine 共用请求、签名、
      配置与图片代理；移除硬编码凭据和地址。部署必须配置 `ERP_API_BASE_URL`、`ERP_APP_KEY`、
      `ERP_SECRET_KEY`。非 ERP 图片源需配置 `ERP_IMAGE_ALLOWED_ORIGINS`，代理不自动跟随重定向。
- [x] **列表/详情规则统一**：库存、可见性、MOQ 和名称共用领域函数；已下架/缺价产品详情返回 404。
- [x] **组件与类型组织**：产品 UI 集中到 `src/components/products`，筛选状态放在
      `src/hooks/products`，目录/详情/路由类型集中在 `src/lib/types/catalog.ts`。
      页面入口仅加载和组装；列表/详情共用价格、MOQ 展示组件。
- [x] **详情页加载慢**：改用 ERP 单品详情接口（`rcdCIqkQ`），不再逐页扫描全量列表；ERP 产品数据
      进程内缓存 5 分钟，列表页顺带预热详情；列表和详情加了加载骨架。
- [x] **错误与分页修复**：ERP 业务失败、平台表查询失败不能当作空数据；平台表分页加载；
      详情可跨 ERP 页查找；URL 参数校验、筛选输入重置已修复。
- [ ] **剩余 ERP 展示类型归并**：Creator Portal 的设计器向导仍有历史 ERP 展示模型，后续
      按实际字段逐步适配共享类型，避免直接把展示模型当成完整 ERP 数据契约。
- [ ] **列表跨页筛选**：当前 category/价格筛选在已取回的 ERP 单页内进行（沿用 portal 做法）。
      当前总页数是 ERP 原始页数，品类、价格排序、计数都是单页结果，并不代表完整目录。
      如需全量筛选，待 ERP 提供带筛选参数的产品接口。
- [ ] **价格币种确认**：ERP 当前类型不含币种，页面沿用美元符号展示。需确认 ERP 价格币种，
      再统一列表/详情的金额格式化；不能因界面中文就推断为人民币。
