# Creator Commerce System — 系统架构设计方案

---

## 项目范围与定位

**本项目 (creator-commerce) 聚焦于 Creator Commerce 系统的开发**，包含 Creator Portal、Admin 管理后台和 Design Engine 三部分。

- **ERP 是已有的独立系统**（Java 开发，有自己的数据库），不在本项目范围内。本项目通过调用 ERP API 获取产品/SKU/模板数据、推送订单、查询结算，**绝不直连 ERP 数据库**。
- **Design Engine（设计器）已有 Node.js MVP**，能同步 ERP 产品数据、编辑设计、生成预览图、导出 JSON。是**共享工具层**，Shopify 主站和 Creator Portal 均可调用。
- **两个系统只认 API 契约，不认数据库。** ERP 内部怎么改表结构不影响我们，我们怎么改也不影响 ERP。

### 全局系统定位

ERP Core 是整个业务的数据底座，向上支撑三个面向不同用户群体的前端系统：

| | Shopify 主站 | Creator Commerce | 中国卖家 Portal |
|---|---|---|---|
| **目标用户** | C端消费者、无店铺 Distributor、Print Shop | Designer、有店铺 Distributor | 中国跨境卖家 |
| **核心需求** | 购物/定制下单、B2B采购 | 上传设计稿/设计器、同步到自己店铺/看收益 | 多店铺管理、供应链外包 |
| **设计器** | 需要（嵌入主站） | 需要 | 不需要 |
| **渠道同步** | 不需要 | Shopify / Etsy / TikTok Shop | 自建独立站 |
| **收益结算** | 无（直接采购） | 差价 / Royalty | 净收入（扣5%平台费） |
| **现阶段方案** | 已有 Shopify 店铺 | **完整开发（本项目）** | 独立开发 |

**Creator Commerce 是本项目的全部范围。** Shopify 主站已有，中国卖家 Portal 独立开发，不在本 repo。

### 项目结构：Monorepo

```
creator-commerce/                  ← 本 repo
├── apps/
│   ├── portal/                    → 部署为 portal.yourdomain.com（Creator 前台）
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── admin/                     → 部署为 admin.yourdomain.com（内部管理后台，可放内网）
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── sync-gateway/              → 部署为内部服务
│       ├── src/
│       ├── package.json
│       └── Dockerfile
├── design-engine/                 → 部署为 editor.yourdomain.com（独立 URL）
│   ├── src/                         已有 Node.js MVP，迁入 monorepo
│   ├── package.json
│   └── Dockerfile
├── packages/
│   └── shared/                    → 共享 TypeScript 类型、工具函数
│       ├── src/
│       │   ├── types/               postMessage 协议、product_configuration 结构等
│       │   └── utils/
│       └── package.json
├── CLAUDE.md
├── package.json                   ← workspace root (pnpm workspaces)
└── turbo.json                     ← turborepo 构建配置
```

**Monorepo 只管源码协作，部署完全独立。** 每个 app / design-engine 有自己的 Dockerfile、独立域名、独立 CI/CD。

### 关键技术决策

| 决策项 | 结论 |
|--------|------|
| **代码结构** | Monorepo (pnpm workspaces + turborepo)，源码在一起方便联调，部署各自独立 |
| **数据库策略** | 两个独立数据库：ERP 自己的 DB（已有，不动）+ Creator Commerce DB（**Supabase**，PostgreSQL 全兼容，Portal + Admin + Design Engine 共享） |
| **Supabase 使用范围** | Auth（Creator 注册/登录）、Storage（artwork/preview/print file 存储）、Database（全部业务表）、RLS（按 creator 隔离数据） |
| **技术栈** | Creator Commerce 全栈 Node.js/TypeScript，ERP 是 Java，不强制统一，通过 REST API 通信 |
| **ERP Customer 创建时机** | Creator/Distributor 审核通过后在 ERP 创建 customer 记录（customerType=creator/distributor），回写 `erpCustomerId` |
| **SKU 策略** | 定制 SKU 单独建 `custom_product_skus` 表，与 ERP 原有 `prodSkuList`（blank SKU）严格分开。审核通过后回写 ERP 创建定制 SKU |
| **Creator 在 ERP 中的身份** | ERP `customers` 表通过 `customerType` 字段区分（creator / distributor / cn_seller / end_consumer），不单独建 module |
| **系统间通信** | Creator Commerce ↔ ERP 完全通过 ERP REST API，不直连数据库 |
| **Design Engine 复用** | 独立部署独立 URL，Shopify 主站和 Creator Portal 均可通过 iframe + API 接入 |

---

## A. 系统总体架构

### 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Channels                            │
│    Shopify (Our)  │  Creator Shopify/Etsy  │  TikTok Shop (Future)  │
└────────────┬───────────┴────────┬──────────┴────────┬───────────────┘
             │                    │                    │
             ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Channel Sync Gateway                             │
│        (统一渠道适配层: listing 推送 / 订单回流 / 库存同步)           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐
│   Creator    │◄─►│  Design Engine  │   │    ERP Core      │
│   Portal     │   │  (共享工具层)    │   │   (数据底座)      │
│  + Admin     │   │                 │   │                  │
│              │   │  ● 设计编辑     │   │  ● 产品/SKU      │
│  ● Onboard   │   │  ● 印刷区域适配 │   │  ● 库存管理      │
│  ● 上传设计  │   │  ● Mockup生成   │   │  ● 订单/履约     │
│  ● 选品建品  │   │  ● Print File   │   │  ● 客户管理      │
│  ● 渠道分发  │   │  ● Session管理  │   │  ● 财务结算      │
│  ● 收入查看  │   │                 │   │                  │
└──────────────┘   └─────────────────┘   └──────────────────┘
```

### 用户角色与系统归属

| 角色 | 有无店铺 | 归属系统 | 发布到我们平台 | 核心流程 |
|------|---------|---------|--------------|---------|
| Designer（无店铺） | 无 | Creator Commerce | 可以 | 上传设计稿 → 我们选品上架 → 收 Royalty |
| Designer（有店铺） | 有 | Creator Commerce | 可以 | 上传设计稿 → 设计器 → 自己店铺 + 我们平台，两种模式可并行 |
| Distributor（有店铺） | 有 | Creator Commerce | **不可以** | 上传设计稿（可选）→ 设计器 → 同步到自己店铺 → 收差价 |
| Distributor（无店铺） | 无 | Shopify 主站 | 不适用 | 直接在 Shopify 浏览产品 → 加购下单 → ERP 履约 |

**Creator Commerce 内部权限差异：**

| 用户类型 | 准入方式 | My Designs 模块 | Product Catalog | 使用设计器 | Request Promotion（自营线） | 同步到自己店铺 |
|---------|---------|----------------|----------------|-----------|--------------------------|--------------|
| Designer | 邀请/申请制，Admin 审核 | **可见** | 可见 | 可以 | **可以** | 可以 |
| Distributor（有店铺） | 注册（轻量审核） | **不可见** | 可见 | 可以 | **不可以** | 可以 |

Designer 和 Distributor 共用同一套系统，区别仅 `userType` 字段控制模块可见性和自营线权限。

### 三条业务线

| | 自营线 (Operator) | Creator 线 | Distributor 线 |
|---|---|---|---|
| **选品决策** | Admin Portal 选设计稿 + ERP 产品 | Creator 从 Admin 开放的产品池自选 | Distributor 自选产品（设计稿可选） |
| **上架渠道** | 我们自己的 Shopify | Creator 自己的店铺 | Distributor 自己的店铺 |
| **收益模型** | 设计师收 Royalty（固定比例） | 设计师收差价（售价 − 供应链成本） | Distributor 收差价（售价 − 供应链成本） |
| **发布到我们平台** | 是（Admin 主导） | 是（设计师可选） | **否**（只能同步到自己店铺） |
| **设计稿来源** | Admin 选用设计师作品 | Designer 上传 | Distributor 自己上传（可选）或直接选 blank |

### 层级职责定义

| 层级 | 系统 | 使用方 | 核心职责 |
|------|------|-------|---------|
| **Layer 1** | ERP Core | 内部系统 | 产品、SKU、订单、履约、客户、财务结算 — 唯一数据真相，永不对外暴露 |
| **Layer 2** | Design Engine | Shopify主站 / Creator Portal | 可复用共享工具层：印刷区域适配、预览生成、print file 输出 |
| **Layer 3** | Admin Portal | 内部运营团队 | 审核设计稿、选品决策、管理客户分组、控制产品池可见性 |
| **Layer 4** | Creator Portal | Designer / Distributor | 上传设计稿、选产品、调设计器、连店铺、看收益 |

### 系统间通信原则

| 通信路径 | 协议 | 说明 |
|----------|------|------|
| Creator Portal → ERP Core | REST API (内部网关) | 读取产品/模板数据、查询订单/收入 |
| Creator Portal → Design Engine | REST API + iframe postMessage | 创建编辑 session、获取 preview、嵌入编辑器 |
| Design Engine → ERP Core | REST API (内部) | 读取产品模板规格、印刷区域参数 |
| ERP Core ↔ Channel Sync Gateway | REST API + Event Bus | Sync Gateway 从 ERP 读取产品/SKU/库存推送到渠道；渠道订单写回 ERP |
| Channel Sync Gateway → 外部渠道 | 各渠道 API (Shopify API 等) | Listing 推送、订单拉取、库存同步（使用对应 store 的 credentials） |
| ERP Core → Creator Portal | Event Bus (异步) | 订单状态变更、结算完成通知 |

**关键原则：**
1. **Creator Portal 绝不直接写入 ERP 核心表**，所有写入通过 API 或 Event 传递，ERP 做最终校验和写入。
2. **Design 内容管理不进 ERP。** Creator 上传的作品（designs、design_versions）及其状态流转属于创作生命周期，由 Creator Portal 管理。ERP 仅在履约时通过引用（print_file_url + sku_id）获取生产所需文件，**存引用，不存内容**。
3. **ERP 订单必须携带完整溯源链路。** 每笔 order_item 上冗余快照 customerId、designId、printFileUrl、printConfigSnapshot 等字段，ERP 自身即可完成结算、报表和生产。
4. **Creator/Distributor 在 ERP 中是 customer 的一种类型。** ERP 通过 `customers` 表的 `customerType` 字段区分（creator / distributor / cn_seller / end_consumer）。Creator Commerce 管理身份、profile、onboarding、store 连接等，ERP 只关心"钱"和"货"。
5. **审核通过后才回写 ERP。** published_products status=approved 后才调 ERP API 创建定制 SKU，避免无效 SKU 污染 ERP 数据。

---

## B. 模块边界说明

### B.1 ERP Core 模块清单

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Product Management | 产品定义、SKU 管理（含 `isCustomizable`、`printTechniques` 扩展）、定价基准 | 不负责 creator 设计内容 |
| Print Areas | 产品印刷区域配置（`print_areas` 表，含像素+毫米双维度） | 不负责编辑器内部逻辑 |
| Customer Management | 统一客户管理：`customerType` 区分 creator/distributor/cn_seller/end_consumer | 不负责 creator 的 profile、onboarding、store 连接 |
| Customer Groups | 客户分组（wholesale/creator/distributor 等）、分组定价（`product_group_pricing`） | 不负责产品池可见性规则的管理界面 |
| Inventory | 库存数量、仓库管理、库存预留 | 不负责渠道 listing 状态 |
| Order Management | 订单创建（含 `orderType`/`sourceChannel` 扩展）、状态流转 | 不负责 creator 前端订单展示 |
| Fulfillment | 拣货、包装、发货、物流跟踪 | 不负责渠道同步 |
| Finance / Settlement | 按 customer 的 commission_rules 计算结算 | 不负责 creator 端的收入展示聚合 |

### B.2 Design Engine 模块清单

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Editor Core | Canvas 编辑器、图层管理、变换操作 | 不负责业务流程（发布、定价） |
| Template Service | 从 ERP 读取产品模板和印刷区域配置 | 不负责产品的商业属性（价格、SKU） |
| Session Manager | 编辑 session 创建/恢复/保存 | 不负责 creator 身份验证 |
| Preview Generator | Mockup 合成、多角度预览图生成 | 不负责 listing 封面图管理 |
| Print File Generator | 印刷文件生成、色彩转换、DPI 适配 | 不负责印刷下单 |

### B.3 Creator Portal 模块清单

> Portal 侧边栏根据 `userType` 动态显示模块。Designer 看到完整模块，Distributor 不显示 My Designs。

| 模块 | 职责 | 可见性 | 不负责 |
|------|------|--------|-------|
| Auth & Onboarding | Creator/Distributor 注册/登录、资料完善、审核流程 | 全部 | 不负责内部员工身份 |
| **My Designs**（仅 Designer） | 设计稿上传、版本管理、状态查看。每个 design 详情页提供两个操作入口：① **Request Promotion**（提交自营线，Admin 选品）② **Create Product**（自建商品，进入产品创建流程） | designer | 不负责设计编辑（由 Design Engine 处理） |
| **Product Catalog** | 商城式展示 ERP 所有可用产品（受 product_visibility_rules 控制），按类别浏览，支持多选产品后进入 Design Editor 上传设计 | 全部 | 不负责产品模板定义（来自 ERP） |
| **Created Products** | 已创建的 published_products 列表页（显示产品信息、状态、渠道），点击进详情 | 全部 | 不负责 ERP 侧产品定义 |
| Design Editor Integration | 嵌入 Design Engine、传递上下文、接收保存结果 | 全部 | 不负责编辑器内部逻辑 |
| Channel Distribution | 渠道选择、per-variant 定价（`channel_listing_variants`）、发布/同步触发 | 全部 | 不负责渠道 API 对接（由 Sync Gateway 处理） |
| Dashboard & Analytics | 收入总览、设计表现、渠道对比 | 全部 | 不负责底层财务计算 |
| Store Connection | OAuth 连接 creator/distributor 自有 store | 全部 | 不负责 store 内的运营管理 |
| Earnings & Payouts | 收入明细展示、Payout 状态查看 | 全部 | 不负责结算计算 |

**Portal 侧边栏结构：**
```
Designer 视角:                    Distributor 视角:
├── Dashboard                     ├── Dashboard
├── My Designs  ← 仅 Designer    ├── Product Catalog
├── Product Catalog               ├── Created Products
├── Created Products              ├── My Store
├── My Store                      └── Earnings
└── Earnings
```

**两种建品入口：**
- **从 My Designs 进入**（Designer 专属）：design 详情页 → "Create Product" → 选产品模板 → Design Editor → 创建 published_product
- **从 Product Catalog 进入**（全部用户）：浏览商品 → 多选产品 → Design Editor（上传/应用设计）→ 创建 published_product

### B.4 Admin 管理后台模块清单

> Admin 和 Portal 共享同一个 Creator Commerce DB 和后端 API，权限在应用层隔离。Admin 面向内部运营团队。

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Creator 管理 | 查看所有 creator/distributor 列表、审核注册申请、暂停/封禁 | 不负责自助注册流程 |
| 设计审核 | 审核 design（通过/拒绝/打回）、内容合规检查 | 不负责设计编辑 |
| **自营选品（curation_decisions）** | **Admin 选设计稿 + 产品组合，reason 字段 Day 1 必填（AI 训练数据）** | 不负责 creator 自主发布 |
| 产品池管理 | 配置 `product_visibility_rules`，控制哪些产品开放给哪类用户 | 不负责产品模板定义（来自 ERP） |
| 产品管理 | 查看所有 published_products、审核产品、强制下架违规产品 | 不负责 ERP 侧产品定义 |
| 渠道监控 | 查看所有 channel listings 状态、sync job 管理 | 不负责渠道 adapter 开发 |
| 订单查看 | 按 creator 维度查看订单（数据从 ERP API 读取） | 不负责订单处理和履约 |
| 结算管理 | 查看 earnings 明细、确认/调整 payout、触发打款 | 不负责结算计算逻辑 |
| 运营配置 | Royalty rate、service fee rate、产品池可见性规则 | 不负责系统级基础设施配置 |
| 数据看板 | 全局总览（GMV、活跃 creator、渠道对比） | 不负责 creator 个人视角展示 |

### B.5 Channel Sync Gateway

**定位：ERP Core 的渠道出口/入口。** 所有外部 store 对系统而言都是"外部渠道"。Gateway 数据源头是 ERP，区别仅在于推送到哪个 store、使用哪套 credentials。

| 模块 | 职责 |
|------|------|
| Shopify Adapter | 统一的 Shopify 渠道适配器，我方 store 和 Creator store 共用，仅 credentials 不同 |
| Channel Router | 根据 channel_type + store_connection 路由到对应 adapter |
| Sync Job Manager | 同步任务队列、重试、状态追踪、错误处理 |
| Order Ingestion | 外部渠道订单标准化 → 调用 ERP API 创建订单 |
| Webhook Handler | 接收外部渠道 webhook，转换后写入 ERP |

---

## C. 数据模型设计

### C.1 核心概念关系图

```
入口 A（Designer: My Designs）          入口 B（Product Catalog）
Design（设计稿上传）                    ERP Product（商城浏览，按类别）
  │                                       │
  │  "Create Product"                     │  多选产品 → Design Editor
  │  或 "Request Promotion"               │  上传/应用设计
  ▼                                       ▼
         Design + ERP Product（含 print_areas）
                    │
                    │  Design Editor 编辑 → editor_sessions
                    ▼
         Published Product（可售产品实体，含 printConfig）
                    │
                    │  生成定制 SKU（每个 variant 一条 custom_product_skus）
                    │  审核通过 → 回写 ERP 创建定制 SKU
                    ▼
         Channel Listing + Channel Listing Variants（各 variant 独立定价）
                    │
                    │  listing 产生销售
                    ▼
         Order → Order Item → creator_earnings → creator_payouts
```

**核心数据主线：Design → Product → Published Product → Channel Listing，必须严格分离。**
**两个建品入口最终汇入同一条主线，区别仅在于起点不同。**

### C.2 ERP 数据结构扩展

> ERP 已有 `ErpProduct` / `ErpProductSku` / `ErpProductImage`，以下为需要新增或扩展的部分。
> ERP 字段沿用 **camelCase** 命名风格。`ErpProductSku` 不做扩展，定制 SKU 单独建 `custom_product_skus` 表管理。

#### customers 表 — 新增字段

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| customerType | ENUM | ✓ | distributor \| creator \| cn_seller \| end_consumer |
| companyName | VARCHAR(255) | – | 公司/工作室名称（B端必填） |
| taxId | VARCHAR(100) | – | 税号 |
| status | ENUM | ✓ | active \| suspended \| pending_review |
| erpInternalNote | TEXT | – | 内部备注，仅 Admin 可见 |

#### customer_stores 表 — 新增

一个客户可绑定多个店铺，不限平台。Distributor、Creator 均可使用。

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| customerId | UUID | ✓ | FK → customers.id |
| storeType | ENUM | ✓ | shopify \| etsy \| tiktok_shop \| woocommerce \| other |
| storeName | VARCHAR(255) | ✓ | 店铺显示名称 |
| storeUrl | VARCHAR(500) | ✓ | 店铺域名/URL |
| accessToken | TEXT | – | OAuth token（加密存储） |
| refreshToken | TEXT | – | 刷新 token |
| tokenExpiresAt | TIMESTAMP | – | token 过期时间 |
| syncStatus | ENUM | ✓ | active \| disconnected \| error \| pending |
| lastSyncAt | TIMESTAMP | – | 最后同步时间 |
| isPrimary | BOOLEAN | ✓ | 是否主店铺，默认 false |

#### customer_payout_methods 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| customerId | UUID | ✓ | FK → customers.id |
| methodType | ENUM | ✓ | paypal \| wire \| check \| store_credit |
| accountInfo | TEXT | ✓ | 账户信息（加密存储） |
| isDefault | BOOLEAN | ✓ | 是否默认结算方式 |
| status | ENUM | ✓ | active \| inactive |

#### customer_commission_rules 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| customerId | UUID | ✓ | FK → customers.id |
| channelType | ENUM | ✓ | our_shopify \| creator_store \| distributor_store |
| earningsType | ENUM | ✓ | royalty（自营线，固定比例）\| margin（差价） |
| royaltyRate | DECIMAL(5,4) | – | 仅 royalty 类型，例如 0.15 = 15% |
| isActive | BOOLEAN | ✓ | 是否生效 |
| effectiveFrom | DATE | ✓ | 生效日期 |
| effectiveTo | DATE | – | 失效日期，null = 永久有效 |

> Creator：our_shopify → royalty；creator_store → margin。
> Distributor：distributor_store → margin（只有差价，无自营线）。

#### customer_groups 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| groupName | VARCHAR(100) | ✓ | wholesale \| creator \| distributor \| retail \| vip \| cn_seller |
| description | TEXT | – | 分组说明 |
| discountType | ENUM | ✓ | fixed_price \| percentage_off \| cost_plus |

#### customer_group_members 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| customerId | UUID | ✓ | FK → customers.id |
| groupId | UUID | ✓ | FK → customer_groups.id |
| effectiveFrom | DATE | ✓ | 生效日期 |
| effectiveTo | DATE | – | 失效日期 |

#### products 表 — 新增字段（定制 POD 支持）

ERP 原有产品表核心字段（id、itemNo、productName、categoryId、brandId、description、status、prodSkuList、prodImageList）保持不变，新增：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| isCustomizable | BOOLEAN | ✓ | 是否可用于定制 POD，默认 false |
| printTechniques | JSON Array | – | 支持的印刷工艺：[dtf, dtg, sublimation, embroidery] |
| customizationNotes | TEXT | – | 定制注意事项 |

#### product_visibility_rules 表 — 新增

控制哪些客户分组能看到并使用某个产品：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| erpProductId | UUID | ✓ | FK → products.id |
| groupId | UUID | ✓ | FK → customer_groups.id |
| canUseForPod | BOOLEAN | ✓ | 该分组是否可用此产品做定制 POD |
| requiresApproval | BOOLEAN | ✓ | 使用此产品是否需要审核，默认 true |
| maxDesignsPerProduct | INT | – | 该分组在此产品上可上架的最大设计数量 |
| updatedBy | UUID | ✓ | 最后修改的 Admin user ID |

#### print_areas 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| erpProductId | UUID | ✓ | FK → products.id |
| itemNo | VARCHAR(100) | ✓ | 对应 ErpProduct.itemNo |
| areaName | VARCHAR(100) | ✓ | front \| back \| left_sleeve \| right_sleeve 等 |
| widthPx | INT | ✓ | 印刷区域宽度（像素） |
| heightPx | INT | ✓ | 印刷区域高度（像素） |
| widthMm | DECIMAL(8,2) | ✓ | 实际印刷宽度（毫米） |
| heightMm | DECIMAL(8,2) | ✓ | 实际印刷高度（毫米） |
| offsetX | INT | – | 区域在产品模板图上的 X 偏移（像素） |
| offsetY | INT | – | 区域在产品模板图上的 Y 偏移（像素） |
| dpiRequired | INT | ✓ | 最低印刷 DPI，通常 300 |
| safeZonePx | INT | – | 安全边距（像素），默认 0 |
| isPrimary | BOOLEAN | ✓ | 是否主印刷区，默认 true |
| previewTemplateUrl | VARCHAR(500) | – | 该区域的 mockup 底图路径（空白产品图，设计器叠加用） |
| sortOrder | INT | – | 排列顺序 |

> `previewTemplateUrl` 是空白产品底图（如白 T 恤平铺图），设计器把设计稿叠上去生成最终预览图。

#### product_group_pricing 表 — 新增

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| erpProductId | UUID | ✓ | FK → products.id |
| erpSkuId | UUID | ✓ | FK → prodSkuList[].id，细分到 variant |
| groupId | UUID | ✓ | FK → customer_groups.id |
| basePrice | DECIMAL(10,2) | ✓ | 该分组的供应链报价，覆盖 ErpProductSku.price |
| currency | VARCHAR(10) | ✓ | 默认 USD |
| effectiveFrom | DATE | ✓ | 生效日期 |
| effectiveTo | DATE | – | 失效日期 |
| updatedBy | UUID | ✓ | 最后修改 Admin ID |

#### orders 表 — 新增字段

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| orderType | ENUM | ✓ | dtf_standard \| blank \| pod_standard \| pod_custom \| mixed |
| sourceChannel | ENUM | ✓ | our_shopify \| creator_shopify \| creator_etsy \| creator_tiktok \| distributor_store \| b2b_direct |
| customerStoreId | UUID | – | FK → customer_stores.id |
| externalOrderId | VARCHAR(255) | – | 外部平台订单号 |

#### order_items 表 — 新增字段

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| itemType | ENUM | ✓ | dtf \| blank \| pod_standard \| pod_custom |
| customProductSkuId | UUID | – | FK → custom_product_skus.id，仅 pod_custom |
| printFileUrl | VARCHAR(500) | – | 印刷文件路径快照，仅 pod_custom |
| printConfigSnapshot | JSON | – | 印刷参数快照：{areaId, x, y, scale, rotation}，仅 pod_custom |
| designId | UUID | – | 关联设计稿 ID，用于收益统计 |

> `printFileUrl` 和 `printConfigSnapshot` 在 order_item 层做快照，保证下单后印刷参数不因后续修改而变化。

### C.3 Creator Commerce 数据结构

> 以下表全部由 Creator Commerce 系统管理，存储在 Supabase。

#### creators 表

Creator 和 Distributor（有店铺）均存此表，通过 `userType` 区分：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| erpCustomerId | UUID | ✓ | FK → ERP customers.id，财务结算走 ERP |
| userId | UUID | ✓ | Portal 登录账号 ID |
| userType | ENUM | ✓ | designer \| distributor — 决定 Portal 显示哪些功能模块 |
| displayName | VARCHAR(255) | ✓ | 公开展示名称/艺名/公司名 |
| bio | TEXT | – | 个人简介 |
| avatarUrl | VARCHAR(500) | – | 头像 |
| portfolioUrl | VARCHAR(500) | – | 作品集链接（Designer 用） |
| specialties | JSON Array | – | 擅长风格：[illustration, typography, anime] |
| onboardingStatus | ENUM | ✓ | applied \| approved \| active \| suspended |
| appliedAt | TIMESTAMP | – | 申请时间 |
| approvedAt | TIMESTAMP | – | 审核通过时间 |
| approvedBy | UUID | – | 审核 Admin user ID |

> `userType = designer` → Portal 显示 My Designs 模块，可走自营线（Request Promotion），也可自建商品。
> `userType = distributor` → 不显示 My Designs，只能从 Product Catalog 建品，不可走自营线。

#### designs 表

Designer 上传的原始设计稿。仅 Designer 可见此模块（My Designs）。从 Product Catalog 建品时在 Design Editor 内上传的设计也会创建 design 记录：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| creatorId | UUID | ✓ | FK → creators.id |
| title | VARCHAR(255) | ✓ | 设计稿标题 |
| description | TEXT | – | 描述 |
| tags | JSON Array | – | 标签 |
| category | VARCHAR(100) | – | 分类 |
| artworkUrl | VARCHAR(500) | ✓ | 原始上传文件路径（PNG/SVG/AI 等） |
| thumbnailUrl | VARCHAR(500) | – | 缩略图 |
| fileWidthPx | INT | – | 文件宽度（像素） |
| fileHeightPx | INT | – | 文件高度（像素） |
| fileDpi | INT | – | 文件 DPI |
| fileSizeBytes | BIGINT | – | 文件大小 |
| status | ENUM | ✓ | draft \| pending_review \| approved \| rejected \| archived |
| reviewNote | TEXT | – | 审核意见，Admin 填写 |
| reviewedBy | UUID | – | 审核 Admin user ID |
| reviewedAt | TIMESTAMP | – | 审核时间 |

#### design_versions 表

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| designId | UUID | ✓ | FK → designs.id |
| versionNumber | INT | ✓ | 版本号，从 1 开始递增 |
| artworkUrl | VARCHAR(500) | ✓ | 该版本文件路径 |
| changeNote | TEXT | – | 修改说明 |
| isCurrent | BOOLEAN | ✓ | 是否为当前版本 |

#### editor_sessions 表

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| userId | UUID | ✓ | FK → creators.id（Designer 或 Distributor） |
| designId | UUID | – | FK → designs.id，Distributor 可不上传设计稿则为 null |
| erpProductId | UUID | ✓ | FK → ERP products.id |
| printAreaId | UUID | – | FK → print_areas.id，有设计稿时必填 |
| configSnapshot | JSON | – | 当前编辑状态：{x, y, scale, rotation} |
| previewUrl | VARCHAR(500) | – | 当前预览图 |
| status | ENUM | ✓ | active \| saved \| abandoned |
| savedToProductId | UUID | – | FK → published_products.id，保存后关联 |

#### published_products 表

设计稿 + ERP 产品模板生成的可售产品实体。`printConfig` 存在此层，各 variant 共用：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| sourceType | ENUM | ✓ | operator（自营）\| creator（Designer发布）\| distributor（Distributor发布） |
| creatorId | UUID | – | FK → creators.id，仅 creator/distributor 来源有值 |
| designId | UUID | – | FK → designs.id，Distributor 可不上传设计稿 |
| designVersionId | UUID | – | FK → design_versions.id，锁定版本，有设计稿时必填 |
| erpProductId | UUID | ✓ | FK → ERP products.id（blank 产品） |
| printAreaId | UUID | – | FK → print_areas.id，有设计稿时必填 |
| printConfig | JSON | – | {x, y, scale, rotation, widthPx, heightPx}，有设计稿时存此层 |
| printFileUrl | VARCHAR(500) | – | 生成的印刷文件路径 |
| previewImageUrl | VARCHAR(500) | – | 通用预览图 |
| title | VARCHAR(255) | ✓ | 产品标题 |
| description | TEXT | – | 产品描述 |
| status | ENUM | ✓ | draft \| pending_review \| approved \| published \| unpublished \| archived |
| reviewNote | TEXT | – | 审核备注，Admin 填写 |
| reviewedBy | UUID | – | 审核 Admin user ID |
| reviewedAt | TIMESTAMP | – | 审核时间 |

> `sourceType = distributor` 时，发布渠道只能是自己的店铺，系统屏蔽 our_shopify 选项。
> 审核通过（approved）后才触发回写 ERP API，在 ERP 创建新 SKU 记录。

#### custom_product_skus 表

定制 SKU，与 ERP 原有 `ErpProductSku`（blank SKU）严格分开。每个 variant（颜色 × 尺码）一条记录：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| publishedProductId | UUID | ✓ | FK → published_products.id |
| erpProductId | UUID | ✓ | FK → ERP products.id |
| erpSkuId | UUID | ✓ | FK → prodSkuList[].id，继承颜色/尺码/重量等 |
| previewImageUrl | VARCHAR(500) | – | 该 variant 预览图（颜色底图不同） |
| erpSyncedSkuId | UUID | – | 回写 ERP 后得到的新 SKU ID |
| syncedAt | TIMESTAMP | – | 回写时间 |
| syncStatus | ENUM | ✓ | pending \| synced \| error |
| isActive | BOOLEAN | ✓ | 是否上架该 variant，默认 true |

> `printConfig` 统一存在 `published_products` 层，各 variant 共用。
> 查找设计师路径：`custom_product_skus → published_products.designId → designs.creatorId → creators`

#### channel_listings 表

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| publishedProductId | UUID | ✓ | FK → published_products.id |
| channelType | ENUM | ✓ | our_shopify \| creator_shopify \| creator_etsy \| creator_tiktok \| distributor_shopify \| distributor_etsy |
| customerStoreId | UUID | – | FK → customer_stores.id |
| externalListingId | VARCHAR(255) | – | 外部平台的商品 ID |
| externalListingUrl | VARCHAR(500) | – | 外部商品链接 |
| status | ENUM | ✓ | pending_sync \| active \| paused \| error \| removed |
| syncErrorMsg | TEXT | – | 同步失败原因 |
| lastSyncedAt | TIMESTAMP | – | 最后同步时间 |
| publishedAt | TIMESTAMP | – | 上架时间 |

#### channel_listing_variants 表

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| channelListingId | UUID | ✓ | FK → channel_listings.id |
| erpSkuId | UUID | ✓ | FK → prodSkuList[].id，对应具体颜色/尺码 variant |
| salePrice | DECIMAL(10,2) | ✓ | 客户自定义的对外售价 |
| compareAtPrice | DECIMAL(10,2) | – | 划线价（可选） |
| baseCostSnapshot | DECIMAL(10,2) | ✓ | 创建时从 product_group_pricing 拍下的供应链成本快照 |
| isActive | BOOLEAN | ✓ | 是否上架该 variant，默认 true |

> **baseCostSnapshot 必须在记录创建时拍快照**，不能动态引用 basePrice，否则供应链涨价会影响历史收益计算。

#### creator_earnings 表

每笔订单产生后自动写入，Creator 和 Distributor 的收益均在此记录：

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| creatorId | UUID | ✓ | FK → creators.id |
| erpOrderId | UUID | ✓ | ERP 订单 ID |
| erpOrderItemId | UUID | ✓ | ERP 订单行项目 ID |
| publishedProductId | UUID | ✓ | FK → published_products.id |
| channelListingId | UUID | ✓ | FK → channel_listings.id |
| channelType | ENUM | ✓ | our_shopify \| creator_store \| distributor_store |
| salePrice | DECIMAL(10,2) | ✓ | 实际售价快照 |
| baseCost | DECIMAL(10,2) | ✓ | 供应链成本快照 |
| earningsType | ENUM | ✓ | royalty \| margin |
| royaltyRate | DECIMAL(5,4) | – | 仅 royalty 类型：佣金比例快照 |
| earningsAmount | DECIMAL(10,2) | ✓ | 本笔收益金额 |
| status | ENUM | ✓ | pending \| confirmed \| paid \| cancelled |
| payoutId | UUID | – | FK → creator_payouts.id，结算时关联 |

> 自营线：`earningsAmount = salePrice × royaltyRate`
> Creator 线 / Distributor 线：`earningsAmount = salePrice − baseCost`

#### creator_payouts 表

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| creatorId | UUID | ✓ | FK → creators.id |
| erpCustomerId | UUID | ✓ | FK → ERP customers.id，财务对账用 |
| periodStart | DATE | ✓ | 结算周期开始 |
| periodEnd | DATE | ✓ | 结算周期结束 |
| totalEarnings | DECIMAL(12,2) | ✓ | 本期总收益 |
| totalOrders | INT | ✓ | 本期订单数 |
| platformFee | DECIMAL(10,2) | – | 平台服务费 |
| payoutAmount | DECIMAL(12,2) | ✓ | 实际打款金额 |
| status | ENUM | ✓ | calculating \| pending_approval \| approved \| processing \| paid \| failed |
| paidAt | TIMESTAMP | – | 实际打款时间 |
| paymentReference | VARCHAR(255) | – | 转账流水号 |
| approvedBy | UUID | – | 审批 Admin user ID |

### C.4 Admin Portal 数据结构

#### curation_decisions 表

Admin 自营选品决策记录。**AI 选品模型未来的训练数据基础，必须从 Day 1 开始填写：**

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| id | UUID | ✓ | 主键 |
| designId | UUID | ✓ | FK → designs.id |
| erpProductId | UUID | ✓ | FK → ERP products.id |
| decision | ENUM | ✓ | selected \| rejected \| deferred |
| reason | TEXT | ✓ | **决策原因 — AI 训练数据核心字段，必填，不能留空** |
| decidedBy | UUID | ✓ | Admin user ID |
| decidedAt | TIMESTAMP | ✓ | |
| resultedInProductId | UUID | – | FK → published_products.id，选中后生成的产品 |

### C.5 核心实体关系

| 表 A | 关系 | 表 B | 说明 |
|------|------|------|------|
| ERP customers | 1:N | customer_stores | 一个客户可绑定多个店铺 |
| ERP customers | 1:N | customer_payout_methods | 多种结算方式 |
| ERP customers | 1:N | customer_commission_rules | 按渠道定义不同佣金 |
| ERP customers | 1:1 | creators | Creator/Distributor 对应 ERP 一条客户记录 |
| customer_groups | M:N | ERP customers | 通过 customer_group_members 关联 |
| ERP products | 1:N | print_areas | 一个产品有多个印刷区域 |
| ERP products | 1:N | product_visibility_rules | 按分组控制可见性 |
| creators | 1:N | designs | 一个 Creator 可上传多个设计稿 |
| designs | 1:N | design_versions | 多个历史版本 |
| designs + ERP products | → | published_products | 设计稿 + 产品 = 可售实体 |
| published_products | 1:N | custom_product_skus | 每个 variant 一条记录 |
| published_products | 1:N | channel_listings | 一个产品可在多渠道上架 |
| channel_listings | 1:N | channel_listing_variants | 每个渠道各 variant 独立定价 |
| channel_listings | 1:N | creator_earnings | 每笔销售产生一条收益记录 |
| creator_earnings | N:1 | creator_payouts | 多条收益汇总到一次结算 |
| designs | 1:N | curation_decisions | Admin 选品决策记录 |

---

## D. 核心流程设计

### D.1 定制 SKU 完整生成流程

以一件 Gildan 白色 T恤 M 码为例：

**Step 1** — ERP 里已有 blank SKU：
```
prodSkuList
├── id:         sku_001
├── productId:  product_tshirt_gildan
├── skuType:    blank
├── parentSkuId: null
├── color:      White
├── size:       M
├── price:      $4.50  (供应链成本)
└── barcode:    xxx
```

**Step 2** — 审核通过，调用 `POST /products/custom-sku` 传给 ERP：
```json
{
  "baseSkuId": "sku_001",
  "productId": "prod_001",
  "printFileUrl": "https://...",
  "printAreaId": "area_front",
  "printConfig": {
    "x": 120, "y": 80, "scale": 1.2, "rotation": 0,
    "widthPx": 1200, "heightPx": 1400,
    "widthMm": 280, "heightMm": 320,
    "dpi": 300, "colorMode": "CMYK", "fileFormat": "PNG",
    "technique": "dtf",
    "whiteInk": false,
    "mirrorPrint": true,
    "safeZonePx": 20
  }
}
```

**Step 3** — ERP 创建定制 SKU，继承 blank SKU 属性：
```
prodSkuList（新增一条）
├── id:           sku_custom_001
├── productId:    prod_001
├── skuType:      custom
├── parentSkuId:  sku_001          ← 继承自白色 M 码
├── color / size: 继承自 sku_001
├── printFileUrl: https://...
├── printAreaId:  'area_front'
└── printConfig:  { ...完整参数... }
```

**Step 4** — ERP 返回新 SKU ID → 写入 `custom_product_skus.erpSyncedSkuId`

**Step 5** — 有客人下单，ERP 通过 `erpSyncedSkuId` 知道怎么生产

### D.2 自营线：Admin 选品 → 上架

| Step | 操作 |
|------|------|
| 1 | Admin 从 product_visibility_rules 确认产品在 operator 分组可用 |
| 2 | Admin 在 curation_decisions 记录选品决策（设计稿 + 产品组合，**必填 reason**） |
| 3 | 系统调 Design Engine，Admin 调整印刷参数，生成 published_products（status: draft, sourceType: operator） |
| 4 | Admin 审核通过 → status: approved → 触发回写 ERP API → 创建定制 SKU |
| 5 | ERP 返回新 SKU ID → 写入 custom_product_skus.erpSyncedSkuId |
| 6 | 创建 channel_listings（our_shopify）+ channel_listing_variants（各 variant 定价） |
| 7 | 上架 Shopify 主站 → status: published |

### D.3 Designer 线 — 从 My Designs 建品

Designer 上传设计稿后，在 design 详情页有两个操作入口：

**路径 A：Request Promotion（走自营线）**

| Step | 操作 |
|------|------|
| 1 | Designer 上传设计稿 → designs（status: pending_review） |
| 2 | Admin 审核设计稿 → status: approved |
| 3 | Designer 在 design 详情页点击 **"Request Promotion"** |
| 4 | 进入 D.2 自营线流程（Admin 选品决策 + 上架到我们平台） |
| 5 | Designer 收 Royalty |

**路径 B：Create Product（自建商品到自己店铺）**

| Step | 操作 |
|------|------|
| 1 | Designer 上传设计稿 → designs（status: pending_review） |
| 2 | Admin 审核设计稿 → status: approved |
| 3 | Designer 在 design 详情页点击 **"Create Product"** |
| 4 | 选择产品模板（从 Product Catalog 中选，受 product_visibility_rules 控制） |
| 5 | 进入 Design Editor → editor_sessions 记录编辑状态 |
| 6 | 保存 → 生成 published_products（status: pending_review, sourceType: creator） |
| 7 | Admin 审核产品 → status: approved → 回写 ERP 创建定制 SKU |
| 8 | Designer 选择渠道（自己的店铺）→ 设置各 variant 售价 → channel_listing_variants |
| 9 | 同步到 Designer 的 Shopify/Etsy → channel_listings.status: active |
| 10 | 订单产生 → 推给 ERP 履约 → 自动写入 creator_earnings（earningsType: margin） |

> 路径 A 和 B 可并行：同一个 design 既可以提交自营线让我们推广，也可以自建商品到自己店铺。

### D.4 从 Product Catalog 建品（Designer + Distributor 共用）

| Step | 操作 |
|------|------|
| 1 | 用户进入 **Product Catalog**，浏览 ERP 产品（按类别展示，商城风格） |
| 2 | 多选产品 → 点击 "Design & Create" |
| 3 | 进入 Design Editor → 上传/选择设计稿 → 编辑 → editor_sessions |
| 4 | 保存 → 生成 published_products（sourceType: creator 或 distributor，取决于 userType） |
| 5 | Admin 审核产品 → status: approved → 回写 ERP 创建定制 SKU |
| 6 | 用户选择渠道 → 设置各 variant 售价（**Distributor 不显示 our_shopify 选项**） |
| 7 | 同步到用户的店铺 → channel_listings.status: active |
| 8 | 订单产生 → 推给 ERP 履约 → 自动写入 creator_earnings |

> Distributor 的唯一建品入口就是 Product Catalog（没有 My Designs 模块）。
> Designer 也可从 Product Catalog 建品，不一定要先上传 design。

### D.5 收益计算逻辑

| 类型 | 计算方式 |
|------|---------|
| 自营线 | `earningsAmount = salePrice × royaltyRate`（从 customer_commission_rules 取） |
| Creator 线 | `earningsAmount = salePrice − baseCostSnapshot`（从 channel_listing_variants 取） |
| Distributor 线 | `earningsAmount = salePrice − baseCostSnapshot`（与 Creator 线相同逻辑） |
| 结算触发 | 按周期汇总 creator_earnings → 生成 creator_payouts → Admin 审批 → 打款 |
| ERP 对账 | creator_payouts.erpCustomerId 关联 ERP customers，财务在 ERP 侧完成对账 |

### D.6 订单回流到 ERP

无论订单来自我方 Shopify 还是 Creator/Distributor 的店铺，回流路径一致：

1. Shopify/Etsy Webhook → Channel Sync Gateway Webhook Handler
2. Gateway 识别来源：匹配 store_connection → channel_listing → published_product → creator → erpCustomerId
3. Gateway 调 ERP API 创建订单（含 orderType、sourceChannel、溯源快照字段）
4. ERP 处理：创建 order + order_items、预留库存、触发履约
5. 订单确认后 → Creator Commerce 自动写入 creator_earnings

---

## E. Design Engine 接入方案

### 短期 (Phase 1): iframe Embedded

```
Creator Portal                    Design Engine
┌──────────────────┐             ┌──────────────────┐
│  Product Builder │◄──────────►│  Editor App      │
│                  │  iframe     │                  │
│  ┌────────────┐  │  postMsg   │  独立部署         │
│  │  iframe     │  │             │  独立域名         │
│  │  editor.    │  │             │  /editor?session= │
│  │  domain.com │  │             │  &token=          │
│  └────────────┘  │             │                  │
└──────────────────┘             └──────────────────┘
```

通信协议：

```typescript
// Portal → Editor
interface EditorInitMessage {
  type: 'INIT_EDITOR';
  payload: {
    sessionId: string;
    token: string;
    theme: 'light' | 'dark';
    locale: string;
  };
}

// Editor → Portal
interface EditorEventMessage {
  type: 'EDITOR_SAVE_COMPLETE'
      | 'EDITOR_PREVIEW_READY'
      | 'EDITOR_CLOSE'
      | 'EDITOR_ERROR';
  payload: {
    sessionId: string;
    configurationId?: string;
    previewUrls?: string[];
    error?: string;
  };
}
```

### 长期 (Phase 3): Micro-frontend + SDK
- 提取 `@company/design-engine-sdk` (npm package)
- 提供 React 组件 `<DesignEditor />`
- 支持 Module Federation

---

## F. API / Service 边界设计

### F.1 Creator Portal API (BFF 层)

#### Creator 身份与 Profile
```
POST   /api/creators/register
POST   /api/creators/login
GET    /api/creators/me
PUT    /api/creators/me/profile
```

#### Design Management
```
POST   /api/designs                       创建 design (上传 artwork)
GET    /api/designs                       列表 (支持 status/tag 筛选)
GET    /api/designs/:id                   详情
PUT    /api/designs/:id                   更新 metadata
DELETE /api/designs/:id                   删除/归档
POST   /api/designs/:id/versions          上传新版本
POST   /api/designs/:id/submit-review     提交审核
```

#### Product Builder
```
GET    /api/product-templates              获取可用产品（受 product_visibility_rules 控制）
GET    /api/product-templates/:id          产品详情（含 print areas）
POST   /api/published-products             创建 published product
GET    /api/published-products             列表
GET    /api/published-products/:id         详情
PUT    /api/published-products/:id         更新
```

#### Design Editor Integration
```
POST   /api/editor/sessions                创建编辑 session
GET    /api/editor/sessions/:id            获取 session 状态
POST   /api/editor/sessions/:id/finalize   确认编辑完成
```

#### Channel Distribution
```
POST   /api/channel-listings                         创建渠道 listing
GET    /api/channel-listings?published_product_id=    查询某产品的所有 listing
PUT    /api/channel-listings/:id                      更新
POST   /api/channel-listings/:id/publish              发布
POST   /api/channel-listings/:id/unpublish            下架
```

#### Store Connection
```
POST   /api/store-connections/shopify/auth-url
POST   /api/store-connections/shopify/callback
GET    /api/store-connections
DELETE /api/store-connections/:id
```

#### Orders & Earnings
```
GET    /api/orders                          creator 的订单
GET    /api/orders/:id                      订单详情
GET    /api/earnings/summary                收入总览
GET    /api/earnings/by-period              按周期
GET    /api/earnings/by-channel             按渠道
GET    /api/earnings/by-design              按 design
GET    /api/payouts                         Payout 列表
```

#### Dashboard
```
GET    /api/dashboard/overview
GET    /api/dashboard/top-designs
GET    /api/dashboard/top-products
GET    /api/dashboard/channel-performance
```

### F.2 Admin 管理后台 API

```
# Creator 管理
GET    /api/admin/creators                     列表
GET    /api/admin/creators/:id                 详情
PUT    /api/admin/creators/:id/status          审核/暂停/封禁

# 设计审核
GET    /api/admin/designs                      列表
GET    /api/admin/designs/:id                  详情
POST   /api/admin/designs/:id/approve          审核通过
POST   /api/admin/designs/:id/reject           审核拒绝

# 自营选品
POST   /api/admin/curation-decisions           记录选品决策（reason 必填）
GET    /api/admin/curation-decisions            决策列表

# 产品池管理
GET    /api/admin/product-visibility-rules      规则列表
PUT    /api/admin/product-visibility-rules/:id  更新规则

# 产品管理
GET    /api/admin/published-products           列表
PUT    /api/admin/published-products/:id/status 强制下架/审核

# 渠道监控
GET    /api/admin/channel-listings             listing 列表
GET    /api/admin/sync-jobs                    同步任务列表
POST   /api/admin/sync-jobs/:id/retry          手动重试

# 订单（从 ERP 读取）
GET    /api/admin/orders                       全局订单列表

# 结算管理
GET    /api/admin/earnings                     全局 earnings
GET    /api/admin/payouts                      结算列表
POST   /api/admin/payouts/:id/approve          审批打款
PUT    /api/admin/payouts/:id/adjust           调整金额

# 运营配置
GET    /api/admin/config
PUT    /api/admin/config/royalty-rates
PUT    /api/admin/config/service-fees

# 数据看板
GET    /api/admin/dashboard/overview
GET    /api/admin/dashboard/creators
GET    /api/admin/dashboard/channels
```

### F.3 ERP 对接接口清单

#### 现有接口（已有）

| 接口 | 方向 | 用途 |
|------|------|------|
| GET /products | ERP → 我们 | 拉取产品列表 |
| GET /products/:id | ERP → 我们 | 产品详情（含 prodSkuList、prodImageList） |
| POST /orders | 我们 → ERP | 推送订单给 ERP 履约 |

#### 需要新增的接口

| 接口 | 方向 | 用途 |
|------|------|------|
| GET /products/:id/print-areas | ERP → 我们 | 拉取印刷区域配置 |
| PUT /customers/:id | 我们 → ERP | 更新 customerType 字段 |
| POST /customers | 我们 → ERP | 审核通过后在 ERP 创建客户记录 |
| **POST /products/custom-sku** | **我们 → ERP** | **审核通过后回写：创建定制 SKU** |
| GET /orders/:id/fulfillment | ERP → 我们 | 查询订单履约状态 |
| GET /skus/:id/cost | ERP → 我们 | 拉取 SKU 供应链成本 |
| GET /products/:id/skus | ERP → 我们 | 拉取产品所有 variant SKU 列表 |

### F.4 Channel Sync Gateway API (内部)

```
POST   /api/sync/listings                  推送 listing 到渠道
PUT    /api/sync/listings/:id              更新 listing
DELETE /api/sync/listings/:id              删除/下架
POST   /api/sync/listings/:id/retry        重试
POST   /api/sync/inventory/push            库存变更推送
POST   /api/sync/webhooks/shopify          Shopify Webhook 入口
POST   /api/sync/webhooks/:platform        通用 Webhook 入口
```

---

## G. 版本路线图

### Phase A1 — MVP（当前，目标 6 月 Go/No-Go）

| 模块 | 时间线 | 交付内容 |
|------|--------|---------|
| Creator/Distributor 招募审核 | 4月 | 注册申请、资料审核、Admin 审核流程、onboarding_status 状态机 |
| 设计稿管理 | 4月 | 上传设计稿、版本管理（design_versions）、Admin 审核、designs 表 |
| 产品池管理（Admin） | 4月 | Admin 配置 product_visibility_rules，控制哪些产品开放给哪类用户 |
| 设计器集成 | 4-5月 | 调用设计器、保存 editor_sessions、生成 published_products |
| Admin 选品（自营线） | 4-5月 | Admin 选设计稿 + 产品，curation_decisions 记录，审核通过回写 ERP |
| custom_product_skus | 5月 | 定制 SKU 生成、variant 管理、ERP 回写接口 |
| 渠道发布（Shopify） | 5月 | Shopify 对接、channel_listings + channel_listing_variants |
| 收益计算基础 | 5-6月 | creator_earnings 自动写入、royalty vs margin 两种计算 |
| Dashboard | 6月 | 订单数据、收益概览、设计稿表现 |

**6月 Go/No-Go 六项指标**：签约 Designer 数、SKU 上线数、月 GMV、top Designer GMV、社媒内容触达、文件返修率

### Phase A2 — 渠道扩展（Q3）

| 模块 | 时间线 | 交付内容 |
|------|--------|---------|
| Etsy 对接 | 7月 | 产品同步、订单回流、listing 状态管理 |
| TikTok Shop 对接 | 7月 | 产品同步、订单回流 |
| Distributor 无店铺直接下单 | 7月 | 绕过渠道同步，订单直推 ERP |
| 结算自动化 | 8月 | 按周期汇总 creator_earnings → creator_payouts 审批 → 打款 |
| KYC / 税表 | 8月 | W-8/W-9 上传、提现前身份验证 |
| 多渠道数据统计 | 9月 | 渠道收入对比、设计稿跨渠道表现分析 |

### Phase A3 — AI 化（2027）

| 方向 | 内容 |
|------|------|
| AI 选品 | 基于 curation_decisions.reason + 销售数据训练推荐模型 |
| AI 预检 | 设计稿提交时自动检查 DPI/尺寸/版权风险 |
| 智能定价 | 基于市场数据推荐各渠道最优售价 |

---

## H. 技术选型

| 层级 | 建议技术栈 |
|------|-----------|
| Creator Portal Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Creator Portal BFF | Next.js API Routes 或独立 Node.js (Fastify/Express) |
| Design Engine Editor | React + Canvas API (Fabric.js / Konva.js) |
| Design Engine Backend | Node.js (独立 service) |
| ERP Core | Java（已有），暴露 REST API |
| Channel Sync Gateway | Node.js + Bull/BullMQ (Job Queue) + Redis |
| Database | **Supabase** (PostgreSQL + Auth + Storage + RLS) + Redis (缓存/队列) |
| File Storage | AWS S3 / Cloudflare R2 |
| Auth | Supabase Auth |
| 部署 | Docker + Render (Admin) / Vercel (Portal) / AWS ECS (Engine, Sync) |

---

## I. 关键风险与设计决策

| 风险点 | 决策 |
|--------|------|
| ERP 回写时机 | 必须在 Admin 审核通过（approved）后才调用创建定制 SKU 接口 |
| designVersionId 版本锁定 | published_products 必须锁定版本，设计师更新设计不能影响已上架产品 |
| baseCostSnapshot 快照 | channel_listing_variants 和 creator_earnings 创建时必须拍快照 |
| curation_decisions.reason | 必须从 Day 1 强制填写，AI 选品唯一训练数据来源 |
| Distributor 不可走自营线 | sourceType=distributor 时，不允许 channelType=our_shopify，API 层强制校验 |
| 渠道售价独立性 | salePrice 完全由 Creator/Distributor 自定义，不与 ERP SKU 价格绑定 |
| ErpProductSku 不扩展 | 定制 SKU 全部在 custom_product_skus 管理，ERP 原有 SKU 结构保持干净 |
| printConfig 存储位置 | 存在 published_products 层，各 variant 共用，不重复存 |
| creator_id 不冗余存储 | 通过 custom_product_skus → published_products.designId → designs.creatorId 查找 |
| 权限隔离 | Admin 和 Creator Portal 共享数据库，API 层用 session/role 控制 |

### 短期可简化 vs Day 1 必须对

| 可以短期简化 | Day 1 必须对 |
|-------------|-------------|
| 仅支持 Shopify 渠道 | channelType 字段和 adapter 抽象 |
| Payout 不做自动打款 | creator_earnings 独立表结构 |
| 只支持 2-3 个模板 | print_areas 通用结构 |
| Dashboard 简化 | earnings 从 ledger 读取而非订单直算 |
| 不做 creator tier | creators 表预留 userType 字段 |
| Design Engine 仅 iframe 嵌入 | Design Engine 独立部署 + 独立 API |
| | curation_decisions Day 1 必上，reason 必填 |
| | product_visibility_rules 控制产品池 |
| | baseCostSnapshot 快照机制 |
| | Distributor 不可走自营线的 API 校验 |
