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
- [x] **卖家等级用 ERP 的「中国商家」**（2026-10-06 决定）：卖家默认归 `CN_MERCHANT`；产品没有
      「中国商家」定价组时按 VIP 取价（`TIER_PRICE_FALLBACK`）。2026-10-06 的 ERP 数据里没有任何产品
      配了该等级的定价组，所以现在全部产品显示的是 VIP 价。
- [ ] **ERP 给产品配「中国商家」定价组**：配上后 cn-portal 自动改用该组。目前按定价组名称
      「中国商家」匹配，这个名称还没有真实数据验证过；ERP 配好第一个产品后核对一次。
- [x] **目录只展示 `chinamerchant` 业务线的产品**（2026-10-06 决定）：按商品字段 prodSupport 过滤
      （`isOfferedToCnSellers`），列表和详情共用。2026-10-06 时 ERP 205 个产品里只有 1 个
      （OLA26090001）开了这条业务线，其余产品要在 ERP 里勾选后才会出现在目录。

- [ ] **印花价为 0 的含义**：ERP 里有的工艺单面或双面售价是 0（例如单面 0、双面 0.48）。
      页面目前照原值显示 $0.00，起价也按 0 计入。需确认 0 是「免费」还是「未报价」。
- [ ] **一个产品有多个供应商报价时卖家看哪个**：同一等级下有的产品有多组定价（不同供应商，
      最多 4 组），详情页目前全部列出并标为「报价方案 1、2…」，不显示供应商名称。
      需确认是否固定一家（对应《待确认清单》6.5）。

## 二、待接入（工程）

- [x] **应用 migration 023 / 024**：2026-10-06 已在生产库执行。024 为三张表开启 RLS、只开放读取，
      写入需走服务端密钥。注意 `_migrations` 里没有 020–022 的记录（它们已手动应用），
      直接跑 `pnpm db:migrate` 会重跑这三个，执行前先看 `pnpm db:status`。
- [x] **应用 migration 027 / 028**（2026-10-11 已执行）。
- [x] **应用 migration 025 / 026**（2026-10-06 已执行）：
      025 给 `cn_seller_tier` 枚举增加 `CN_MERCHANT`，未执行时按该等级查询 `seller_product_visibility`
      会报错（22P02），选品页打不开。026 新建卖家账户表 `cn_sellers`，并修改 auth.users 的注册触发器
      `handle_new_user`：从 cn-portal 注册的用户只建卖家账户，不再建 Creator 记录。
      026 未执行时注册页会提示「注册暂未开放」，不会创建用户。
- [x] **卖家注册 / 登录**：`/register`、`/login`，与 Creator Portal 共用 Supabase Auth。选品页需要登录
      （`src/proxy.ts`），价格等级取自 `cn_sellers.seller_tier`（`requireSeller`），cookie 占位已删除。
      新账户一律是 `CN_MERCHANT`；卖家不能自己改等级（表对登录用户只读）。
- [x] **调整卖家等级的入口**：Admin 后台 `/dashboard/cn-sellers` 列出卖家、可改等级、显示 ERP 同步状态
      （migration 028 给 admin 加读写策略）。等级改动暂不回写 ERP，等「编辑客户」接口授权后再做。
- [ ] **已有 Creator Portal 账号的邮箱不能再注册卖家**：两边共用登录体系，同一邮箱只有一个用户；
      这类用户登录 cn-portal 会提示「该账户未开通卖家平台」。需要时再做「为已有账号开通卖家」。
- [x] **找回密码**：`/forgot-password` 发重设邮件，`/reset-password` 设新密码；邮件链接落到 `/auth/confirm`
      换取会话（兼容 `?code=` 和 `?token_hash=`），注册验证邮件也改为回到本站。
      上线前要在 Supabase → Authentication → URL Configuration 的 Redirect URLs 里加上
      `https://<cn-portal 域名>/auth/confirm`（本地开发加 `http://localhost:3002/auth/confirm`），
      否则链接会跳回项目默认站点（Creator Portal）。可用 `CN_PORTAL_PUBLIC_URL` 固定回跳域名。
      邮件链接需在发起申请的同一浏览器里打开（PKCE）。
- [ ] **卖家账户对接 ERP 客户档案**（代码已接好，等 ERP 给 appKey 授权）：注册成功后 `syncSellerToErp`
      取 ERP 客户等级列表、按等级名找到「中国商家」（id `2094267395165773826`），调「新增客户」（`RIv0P9vK`）
      写入 `custStageId / vipStage`，再用服务端密钥回写 `cn_sellers.erp_customer_id / erp_customer_level_id`；
      失败记为 `erp_sync_status = failed` 并保留原因，登录时重试（migration 027）。
      2026-10-11 实测：当前 appKey 调「新增客户」返回「该appKey未授权当前接口」，等级列表和客户详情可读。
      需要 ERP 侧：① 给 appKey 授权 `RIv0P9vK`（后续编辑客户 `9EqmqMxD` 也要）；② 确认必填字段——示例说 11 个，
      注册只收集公司名、联系人、手机号、邮箱，请求体不编造地址等；③ 确认 `sysOrgCode`（文档 A02A04，
      现有客户记录都是 A02A01）和客户分类 `custSortId`。字段名以现有客户记录为准：等级是 `custStageId / vipStage`。
- [x] **可见性表按等级收紧 RLS**：migration 028 后 `seller_product_visibility` 只读本人等级的行（admin 可读全部）。
- [x] **详情页 variant 精确价**：详情页新增「价格明细」表，按「尺码档 × 色档」列出该等级的空白件售价
      和各工艺单面 / 双面印花售价（`resolveTierPriceTables`）。只列可上架 SKU 覆盖到的尺码和颜色。
      起价与明细同源：空白件售价改为优先取色档价（`colorPrices`），此前只取尺码档的 `blankPrice`。
- [ ] **下单 / 购物车模块**：详情页「加入购物车」现为占位（`AddToCart.tsx`）。
- [ ] **后台缺价清单页**（暂缓，2026-10-06 决定先不做）：`buildCatalog` 已产出 `missingPriceProducts`，需一个运营可见的清单页
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
- [x] **列表跨页筛选**：目录改为取回 ERP 全部产品后在本地筛选、排序、分页（每页 40），品类、
      价格排序和计数都是完整目录的结果。ERP 列表接口只有分页参数，不能按业务线筛选；
      全量数据走 5 分钟缓存，缓存失效后的第一次打开要重新拉全量。
- [ ] **价格币种确认**：ERP 当前类型不含币种，页面沿用美元符号展示。需确认 ERP 价格币种，
      再统一列表/详情的金额格式化；不能因界面中文就推断为人民币。
