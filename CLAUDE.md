# Creator Commerce System — 系统架构设计方案

---

## 项目范围与定位

**本项目 (creator-commerce) 聚焦于 Creator Commerce 系统的开发**，包含 Creator Portal、Admin 管理后台和 Design Engine 三部分。

- **ERP 是已有的独立系统**（Java 开发，有自己的数据库），不在本项目范围内。本项目通过调用 ERP API 获取产品/SKU/模板数据、推送订单、查询结算，**绝不直连 ERP 数据库**。
- **Design Engine（设计器）已有 Node.js MVP**，能同步 ERP 产品数据、编辑设计、生成预览图、导出 JSON。尚未与 ERP 打通 API，下一步重点是补 API 层（保存 product_configuration 到数据库、preview/print file 写入存储）。
- **两个系统只认 API 契约，不认数据库。** ERP 内部怎么改表结构不影响我们，我们怎么改也不影响 ERP。

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

**Monorepo 只管源码协作，部署完全独立。** 每个 app / design-engine 有自己的 Dockerfile、独立域名、独立 CI/CD。其他系统复用 Design Engine 时，嵌入的是 `editor.yourdomain.com` 这个部署产物，不需要访问源码。

### 关键技术决策

| 决策项 | 结论 |
|--------|------|
| **代码结构** | Monorepo (pnpm workspaces + turborepo)，源码在一起方便联调，部署各自独立 |
| **数据库策略** | 两个独立数据库：ERP 自己的 DB（已有，不动）+ Creator Commerce DB（**Supabase**，PostgreSQL 全兼容，Portal + Admin + Design Engine 共享） |
| **Supabase 使用范围** | Auth（Creator 注册/登录）、Storage（artwork/preview/print file 存储）、Database（全部业务表）、RLS（按 creator 隔离数据） |
| **技术栈** | Creator Commerce 全栈 Node.js/TypeScript，ERP 是 Java，不强制统一，通过 REST API 通信 |
| **ERP Partner 创建时机** | 懒创建：Creator 注册时不创建 ERP partner 记录，**首次发布产品时**才调 ERP API 创建 partner 并回写 `erp_partner_id` |
| **SKU 策略** | Creator 创建可售产品时默认包含该模板所有 SKU，Creator 可取消勾选不想卖的 SKU |
| **系统间通信** | Creator Commerce ↔ ERP 完全通过 ERP REST API，不直连数据库 |
| **Design Engine 复用** | 独立部署独立 URL，其他系统通过 iframe + API 接入，无需访问源码；未来可提取 npm SDK |

---

## A. 系统总体架构

### 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Channels                            │
│    Shopify (Our)  │  Creator Shopify  │  TikTok Shop/Etsy (Future)  │
└────────────┬───────────┴────────┬──────────┴────────┬───────────────┘
             │                    │                    │
             ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Channel Sync Gateway                             │
│        (统一渠道适配层: listing 推送 / 订单回流 / 库存同步)           │
│                                                                     │
│   本质：ERP Core 与外部渠道之间的桥梁                                │
│   所有 Shopify store（无论我方还是 Creator 的）都是"外部渠道"         │
│   区别仅在于使用哪套 store credentials                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ 直接对接 ERP Core
                             │ (listing数据从ERP取, 订单写回ERP)
                             │
┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐
│              │   │                 │   │                  │
│   Creator    │◄─►│  Design Engine  │   │    ERP Core      │
│   Portal     │   │   (Layer 2)     │   │    (Layer 1)     │
│  (Layer 3)   │   │                 │   │                  │
│              │   │  ● 设计编辑     │   │  ● 产品/SKU      │◄──┘
│  ● Onboard   │   │  ● 模板适配     │   │  ● 库存管理      │
│  ● 上传作品  │   │  ● Mockup生成   │   │  ● 订单/履约     │
│  ● 选品建品  │   │  ● Print File   │   │  ● 发货/物流     │
│  ● 渠道分发  │   │  ● 图层/区域    │   │  ● 客户管理      │
│  ● 收入查看  │   │  ● Session管理  │   │  ● 财务结算      │
│  ● Store连接 │   │                 │   │  ● Payout Ledger │
│              │   │                 │   │                  │
└──────┬───────┘   └────────┬────────┘   └────────┬─────────┘
       │                    │                      │
       └────────────────────┼──────────────────────┘
                            ▼
                ┌───────────────────────┐
                │   Shared Services     │
                │  ● Auth / IAM         │
                │  ● File Storage (S3)  │
                │  ● Event Bus          │
                │  ● Job Queue          │
                │  ● Notification       │
                └───────────────────────┘
```

**核心认知：所有 Shopify store 对系统而言都是"外部渠道"。Channel Sync Gateway 的职责是作为 ERP 的渠道出口/入口，而非 store 与 store 之间的桥梁。**

### 三层职责定义

| 层级 | 系统 | 核心职责 | 数据所有权 |
|------|------|---------|-----------|
| **Layer 1** | ERP Core | 业务真相源：产品、SKU、库存、订单、履约、财务 | 拥有所有交易数据和结算数据。**不拥有设计内容**，仅存储 print_file_url 等引用 |
| **Layer 2** | Design Engine | 可复用设计能力：编辑器、模板适配、preview/print 生成 | 拥有设计配置（product_configurations）、编辑 session、生成产物（preview/print file） |
| **Layer 3** | Creator Portal | Creator 体验层：onboarding、内容管理、选品、分发、收入 | 拥有 creator 身份、**设计内容管理**（designs、versions、assets、tags、状态流转）、渠道偏好、listing 配置 |
| **Layer 3** | Admin 管理后台 | 内部运营层：creator 审核、设计审核、内容管理、订单查看、结算确认、运营配置 | 与 Portal 共享同一 Creator Commerce DB，但独立部署、独立权限体系 |

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
2. **Design 内容管理不进 ERP。** Creator 上传的作品（designs、design_versions、design_assets、design_tags）及其状态流转（draft → review → published）属于创作生命周期，由 Creator Portal 管理。Design Engine 负责设计配置和生成产物（preview/print file）。ERP 仅在履约时通过引用（print_file_url + sku_id）获取生产所需文件，**存引用，不存内容**。
3. **ERP 订单必须携带完整溯源链路。** 每笔订单/订单行进入 ERP 时，必须记录 partner_id、design_id、channel_listing_id、print_file_url 等关键引用。ERP 需要知道"这是哪个合作伙伴的哪个设计、从哪个渠道卖出的"，以支撑按 partner 结算、按 design 统计销量、按渠道拆分收入、生产时定位印刷文件。这些字段在 order_item 上做快照冗余，避免结算和报表时反查外部系统。
4. **Creator 在 ERP 中是一种 partner 类型，不单独建 module。** ERP 通过通用的 `partners` 表管理所有合作伙伴（creator / reseller / wholesaler / affiliate 等），每个 partner 有各自的 settlement_terms。Creator 的身份信息、profile、onboarding、store 连接等全部由 Creator Commerce 系统管理，ERP 只关心"钱"和"货"。

---

## B. 模块边界说明

### B.1 ERP Core 模块清单

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Product Management | 产品定义、产品模板、SKU 管理、定价基准 | 不负责 creator 设计内容（artwork、design 版本/状态/标签等均由 Creator Commerce 管理） |
| Inventory | 库存数量、仓库管理、库存预留 | 不负责渠道 listing 状态 |
| Order Management | 订单创建、状态流转、拆单合单 | 不负责 creator 前端订单展示逻辑 |
| Fulfillment | 拣货、包装、发货、物流跟踪 | 不负责渠道同步 |
| Customer | 客户信息、地址管理 | 不负责 creator 身份管理 |
| **Partner Management** | **通用合作伙伴管理：partner 记录、类型（creator/reseller/...）、settlement terms、打款账户** | **不负责 creator 的 profile、onboarding、store 连接等（均由 Creator Commerce 管理）** |
| Finance / Settlement | Payout Ledger、Settlement Ledger、按 partner 的 settlement terms 计算 | 不负责 creator 端的收入展示聚合 |

### B.2 Design Engine 模块清单

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Editor Core | Canvas 编辑器、图层管理、变换操作 | 不负责业务流程（发布、定价） |
| Template Service | 产品模板管理、印刷区域定义、safe zone | 不负责产品的商业属性（价格、SKU） |
| Session Manager | 编辑 session 创建/恢复/保存 | 不负责 creator 身份验证 |
| Preview Generator | Mockup 合成、多角度预览图生成 | 不负责 listing 封面图管理 |
| Print File Generator | 印刷文件生成、色彩转换、DPI 适配 | 不负责印刷下单 |
| Asset Storage | 设计产物（preview/print file）存储管理 | 不负责原始 artwork 管理 |

### B.3 Creator Portal 模块清单

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Auth & Onboarding | Creator 注册/登录、资料完善、审核流程 | 不负责内部员工身份 |
| Design Management | Artwork 上传、元数据编辑、状态管理（草稿→发布） | 不负责设计编辑（由 Design Engine 处理） |
| Product Builder | 选择产品模板、关联 design、创建可售产品实例 | 不负责产品模板定义（来自 ERP） |
| Design Editor Integration | 嵌入 Design Engine、传递上下文、接收保存结果 | 不负责编辑器内部逻辑 |
| Channel Distribution | 渠道选择、per-channel 定价、发布/同步触发 | 不负责渠道 API 对接（由 Sync Gateway 处理） |
| Dashboard & Analytics | 收入总览、设计表现、渠道对比、Top Selling | 不负责底层财务计算 |
| Store Connection | OAuth 连接 creator 自有 store、同步状态管理 | 不负责 store 内的运营管理 |
| Earnings & Payouts | 收入明细展示、Payout 状态查看、提现申请 | 不负责结算计算（来自 ERP Finance） |

### B.4 Admin 管理后台模块清单

> Admin 和 Portal 是**两个独立 app**，共享同一个 Creator Commerce DB 和后端 API。Admin 面向内部运营团队，拥有最高权限。部署在内网或需要内部 SSO 认证。

| 模块 | 职责 | 不负责 |
|------|------|-------|
| Creator 管理 | 查看所有 creator 列表、审核注册申请、暂停/封禁 creator、编辑 creator 信息 | 不负责 creator 自助注册流程 |
| 设计审核 | 审核 creator 提交的 design（通过/拒绝/打回）、内容合规检查 | 不负责设计编辑 |
| 产品管理 | 查看所有 sellable product instances、强制下架违规产品 | 不负责产品模板定义（来自 ERP） |
| 渠道监控 | 查看所有 channel listings 状态、sync job 成功/失败/重试、强制重新同步 | 不负责渠道 adapter 开发 |
| 订单查看 | 按 creator 维度查看订单、订单状态追踪（数据从 ERP API 读取） | 不负责订单处理和履约 |
| 结算管理 | 查看 earnings 明细、确认/调整 payout、触发打款（调 ERP API） | 不负责结算计算逻辑 |
| 运营配置 | Royalty rate、service fee rate、产品模板上下架、审核规则等运营参数 | 不负责系统级基础设施配置 |
| 数据看板 | 全局 creator 数据总览、GMV、活跃 creator 数、渠道 GMV 对比 | 不负责 creator 个人视角的展示 |

### B.5 Channel Sync Gateway

**定位：Channel Sync Gateway 是 ERP Core 的渠道出口/入口。** 所有外部 Shopify store（无论我方还是 Creator 的）对系统而言都是"外部渠道"。Gateway 的数据源头是 ERP，区别仅在于推送到哪个 store、使用哪套 credentials。

| 模块 | 职责 |
|------|------|
| Shopify Adapter | 统一的 Shopify 渠道适配器：从 ERP 读取产品/SKU/库存 → 推送到目标 Shopify store；从 Shopify 拉取订单 → 写入 ERP。我方 store 和 Creator store 共用同一个 adapter，仅 credentials 不同 |
| Channel Router | 根据 channel_type + store_connection 路由到对应 adapter，传入正确的 credentials |
| Sync Job Manager | 同步任务队列、重试、状态追踪、错误处理 |
| Order Ingestion | 外部渠道订单标准化 → 调用 ERP API 创建订单、预留库存、触发履约 |
| Webhook Handler | 接收外部渠道 webhook（订单创建/更新、库存变更），转换后写入 ERP |

---

## C. 数据模型设计

### C.1 核心概念关系图

```
Design（创作资产）
  │
  │  creator 选择产品模板
  ▼
Product Template（产品模板，来自 ERP）
  │
  │  design + template → 进入编辑器配置
  ▼
Product Configuration（设计在产品上的配置：位置、缩放、旋转）
  │
  │  configuration → 生成可售实体
  ▼
Sellable Product Instance（可售产品实例）
  │
  │  instance → 分发到渠道
  ▼
Channel Listing（某渠道中的 listing，含独立价格）
  │
  │  listing 产生销售
  ▼
Order → Order Item → Earnings → Payout
```

**这四层抽象（Design → Template → Configuration/Instance → Listing）是系统最核心的数据主线，必须严格分离。**

**ERP 溯源链路：** 当订单进入 ERP 时，order_item 上冗余快照以下字段，确保 ERP 自身即可完成结算、报表和生产，无需反查 Creator Portal 或 Design Engine：

```
order_item
  ├── partner_id          → 哪个合作伙伴（ERP partners 表，type='creator'）
  ├── design_id           → 哪个设计（外部引用，ERP 不存设计内容）
  ├── design_version_id   → 下单时的设计版本
  ├── product_template_id → 基于哪个产品模板
  ├── channel_type        → 从哪个渠道卖出 (marketplace / creator_store)
  ├── channel_listing_id  → 具体 listing
  ├── print_file_url      → 生产用的印刷文件
  ├── unit_price          → 售价快照
  └── unit_cost           → 成本快照
```

### C.2 ERP Core Tables

#### partners

> Creator 在 ERP 中不单独建 module，而是作为通用合作伙伴的一种类型。
> 未来 reseller、wholesaler、affiliate 等都复用同一张表。

```sql
CREATE TABLE partners (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id         UUID,                       -- 外部系统 ID（如 Creator Commerce 中的 creator_id）
    type                VARCHAR(30) NOT NULL,       -- 'creator' / 'reseller' / 'wholesaler' / 'affiliate'
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255),
    status              VARCHAR(20) DEFAULT 'active',  -- active / suspended / terminated
    settlement_terms    JSONB NOT NULL DEFAULT '{}',
    -- settlement_terms 示例:
    -- Creator (marketplace): {"model": "royalty", "royalty_rate": 0.15}
    -- Creator (own store):   {"model": "margin", "service_fee_rate": 0.05}
    -- Reseller:              {"model": "wholesale", "discount_rate": 0.40}
    payment_info        JSONB DEFAULT '{}',         -- 打款账户信息（加密存储）
    -- {"method": "stripe_connect", "account_id": "acct_xxx"}
    -- {"method": "paypal", "email": "xxx@xxx.com"}
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_external_id ON partners(external_id);
```

#### products

```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),          -- e.g. 'apparel', 'drinkware', 'accessories'
    base_cost       DECIMAL(10,2),         -- 我方生产/采购成本
    status          VARCHAR(20) DEFAULT 'active',  -- active / discontinued
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### product_templates

```sql
CREATE TABLE product_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    name            VARCHAR(255) NOT NULL,  -- e.g. 'Classic Tee - Front Print'
    description     TEXT,
    thumbnail_url   VARCHAR(500),
    blank_mockup_url VARCHAR(500),          -- 空白产品底图
    status          VARCHAR(20) DEFAULT 'active',
    sort_order      INT DEFAULT 0,
    metadata        JSONB DEFAULT '{}',     -- 尺寸规格、材质等
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### skus

```sql
CREATE TABLE skus (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    sku_code        VARCHAR(100) UNIQUE NOT NULL,
    attributes      JSONB NOT NULL DEFAULT '{}',  -- {"size": "L", "color": "Black"}
    cost            DECIMAL(10,2),
    weight_g        INT,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### inventory

```sql
CREATE TABLE inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id          UUID NOT NULL REFERENCES skus(id),
    warehouse_id    VARCHAR(50) NOT NULL,
    quantity         INT NOT NULL DEFAULT 0,
    reserved_qty    INT NOT NULL DEFAULT 0,   -- 已被订单预留
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sku_id, warehouse_id)
);
```

#### orders

```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    VARCHAR(50) UNIQUE NOT NULL,
    source          VARCHAR(30) NOT NULL,      -- 'marketplace' / 'creator_store'
    channel_type    VARCHAR(30),               -- 'our_shopify' / 'creator_shopify'
    partner_id      UUID REFERENCES partners(id),  -- 关联的合作伙伴（creator/reseller 等，可为空：自营订单）
    customer_id     UUID REFERENCES customers(id),
    external_order_id VARCHAR(100),            -- 外部渠道订单号
    status          VARCHAR(30) DEFAULT 'pending',  -- pending/confirmed/processing/shipped/delivered/cancelled
    subtotal        DECIMAL(10,2),
    shipping_cost   DECIMAL(10,2),
    tax             DECIMAL(10,2),
    total_amount    DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    shipping_address JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### order_items

```sql
CREATE TABLE order_items (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                    UUID NOT NULL REFERENCES orders(id),
    sku_id                      UUID NOT NULL REFERENCES skus(id),
    sellable_product_instance_id UUID REFERENCES sellable_product_instances(id),
    channel_listing_id          UUID,

    -- 溯源快照字段（冗余存储，避免结算/报表/生产时反查外部系统）
    partner_id                  UUID,                 -- 快照：所属合作伙伴（ERP partners 表）
    design_id                   UUID,                 -- 快照：来源 design（外部引用）
    design_version_id           UUID,                 -- 快照：下单时的 design 版本
    product_template_id         UUID,                 -- 快照：产品模板
    channel_type                VARCHAR(30),           -- 快照：'marketplace' / 'creator_store'
    print_file_url              VARCHAR(500),          -- 快照：印刷文件 URL，生产履约直接使用

    quantity                    INT NOT NULL DEFAULT 1,
    unit_price                  DECIMAL(10,2) NOT NULL,
    unit_cost                   DECIMAL(10,2),        -- 快照：下单时成本
    total_price                 DECIMAL(10,2) NOT NULL,
    metadata                    JSONB DEFAULT '{}',
    created_at                  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_order_items_partner ON order_items(partner_id);
CREATE INDEX idx_order_items_design ON order_items(design_id);
```

#### shipments

```sql
CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id),
    tracking_number VARCHAR(100),
    carrier         VARCHAR(50),
    status          VARCHAR(30) DEFAULT 'pending',  -- pending/shipped/in_transit/delivered
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### customers

```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255),
    name            VARCHAR(255),
    phone           VARCHAR(50),
    default_address JSONB,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### payout_ledger

```sql
CREATE TABLE payout_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID NOT NULL REFERENCES partners(id),
    order_item_id   UUID REFERENCES order_items(id),
    earning_type    VARCHAR(30) NOT NULL,    -- 'royalty' / 'margin' / 'bonus'
    channel_type    VARCHAR(30) NOT NULL,    -- 'marketplace' / 'creator_store'
    gross_amount    DECIMAL(10,2) NOT NULL,  -- 售价
    cost_amount     DECIMAL(10,2) NOT NULL,  -- 成本
    platform_fee    DECIMAL(10,2) DEFAULT 0, -- 平台抽成
    net_amount      DECIMAL(10,2) NOT NULL,  -- partner 实得
    currency        VARCHAR(3) DEFAULT 'USD',
    status          VARCHAR(20) DEFAULT 'pending',  -- pending / settled / paid
    period          VARCHAR(7),              -- e.g. '2026-03' 所属结算周期
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payout_ledger_partner ON payout_ledger(partner_id);
```

#### settlement_ledger

```sql
CREATE TABLE settlement_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID NOT NULL REFERENCES partners(id),
    period          VARCHAR(7) NOT NULL,     -- '2026-03'
    total_earnings  DECIMAL(10,2) NOT NULL,
    deductions      DECIMAL(10,2) DEFAULT 0,
    net_payout      DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending / processing / paid / failed
    payment_method  VARCHAR(30),
    payment_ref     VARCHAR(200),            -- 支付平台交易号
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### C.3 Creator Tables (归属 Creator Commerce 系统，非 ERP)

> 以下表全部由 Creator Commerce 系统管理。Creator 的身份、资料、store 连接、收入展示都不进 ERP。
> Creator 在 ERP 中仅对应 `partners` 表中一条 `type='creator'` 的记录。
> `erp_partner_id` 懒创建：Creator 注册时为 NULL，首次发布产品时调 ERP API 创建 partner 并回写。

#### creators

```sql
CREATE TABLE creators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    erp_partner_id  UUID,                       -- 对应 ERP partners 表的 ID，首次发布产品时懒创建（注册时为 NULL）
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'pending',  -- pending/active/suspended/banned
    onboarding_step VARCHAR(30) DEFAULT 'profile',
    agreed_terms_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_creators_erp_partner ON creators(erp_partner_id);
```

#### creator_profiles

```sql
CREATE TABLE creator_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID UNIQUE NOT NULL REFERENCES creators(id),
    display_name    VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE,       -- URL-friendly 唯一标识
    bio             TEXT,
    avatar_url      VARCHAR(500),
    banner_url      VARCHAR(500),
    social_links    JSONB DEFAULT '{}',        -- {"instagram": "...", "twitter": "..."}
    country         VARCHAR(2),
    timezone        VARCHAR(50),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### creator_store_connections

```sql
CREATE TABLE creator_store_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id),
    platform        VARCHAR(30) NOT NULL,      -- 'shopify' / 'tiktok_shop' / 'etsy'
    store_name      VARCHAR(255),
    store_url       VARCHAR(500),
    access_token    TEXT,                       -- 加密存储
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes          TEXT[],
    status          VARCHAR(20) DEFAULT 'connected',  -- connected/disconnected/expired/error
    last_sync_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    connected_at    TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, platform)
);
```

#### creator_earnings_summary (聚合视图，底层数据来自 ERP payout_ledger)

> Creator Commerce 定期从 ERP 的 payout_ledger 同步/聚合数据到本地，用于 Dashboard 展示。
> 这是一张**读优化的本地缓存表**，不是 source of truth（source of truth 在 ERP payout_ledger）。

```sql
CREATE TABLE creator_earnings_summary (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id),
    erp_partner_id  UUID NOT NULL,              -- 冗余：方便从 ERP 同步时匹配
    period          VARCHAR(7) NOT NULL,        -- '2026-03'
    channel_type    VARCHAR(30) NOT NULL,
    total_orders    INT DEFAULT 0,
    total_units     INT DEFAULT 0,
    gross_revenue   DECIMAL(10,2) DEFAULT 0,
    total_cost      DECIMAL(10,2) DEFAULT 0,
    platform_fees   DECIMAL(10,2) DEFAULT 0,
    net_earnings    DECIMAL(10,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'USD',
    synced_at       TIMESTAMPTZ,                -- 最后从 ERP 同步时间
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, period, channel_type)
);
```

### C.4 Design Tables (归属 Creator Portal，非 ERP)

> 以下表由 Creator Portal 服务管理。Design 内容属于创作生命周期，不进入 ERP。
> ERP 仅在履约环节通过 `print_file_url` 引用获取生产所需文件。

#### designs

```sql
CREATE TABLE designs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'draft',  -- draft/pending_review/approved/published/archived/rejected
    rejection_reason TEXT,
    current_version_id UUID,                       -- 指向当前活跃版本
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### design_versions

```sql
CREATE TABLE design_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id),
    version_number  INT NOT NULL,
    changelog       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(design_id, version_number)
);
```

#### design_assets

```sql
CREATE TABLE design_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_version_id UUID NOT NULL REFERENCES design_versions(id),
    asset_type      VARCHAR(30) NOT NULL,     -- 'artwork' / 'preview' / 'source_file'
    file_url        VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255),
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    width_px        INT,
    height_px       INT,
    dpi             INT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### design_tags

```sql
CREATE TABLE design_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES designs(id),
    tag             VARCHAR(50) NOT NULL,
    UNIQUE(design_id, tag)
);
CREATE INDEX idx_design_tags_tag ON design_tags(tag);
```

### C.5 Design Engine / Product Config Tables

#### print_areas

```sql
CREATE TABLE print_areas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_template_id UUID NOT NULL REFERENCES product_templates(id),
    name                VARCHAR(100) NOT NULL,     -- 'front', 'back', 'left_sleeve'
    position_x          DECIMAL(8,2) NOT NULL,     -- 印刷区域左上角 X (mm)
    position_y          DECIMAL(8,2) NOT NULL,
    width               DECIMAL(8,2) NOT NULL,     -- 印刷区域宽 (mm)
    height              DECIMAL(8,2) NOT NULL,
    safe_zone_margin    DECIMAL(8,2) DEFAULT 0,    -- 安全边距 (mm)
    max_dpi             INT DEFAULT 300,
    sort_order          INT DEFAULT 0,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now()
);
```

#### editor_sessions

```sql
CREATE TABLE editor_sessions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                  UUID NOT NULL REFERENCES creators(id),
    product_template_id         UUID NOT NULL REFERENCES product_templates(id),
    design_version_id           UUID NOT NULL REFERENCES design_versions(id),
    sellable_product_instance_id UUID,              -- 如果是编辑已有实例
    session_data                JSONB DEFAULT '{}', -- 编辑器完整状态快照
    status                      VARCHAR(20) DEFAULT 'active',  -- active/saved/expired
    expires_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);
```

#### product_configurations

```sql
CREATE TABLE product_configurations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sellable_product_instance_id UUID UNIQUE NOT NULL,
    design_version_id       UUID NOT NULL REFERENCES design_versions(id),
    product_template_id     UUID NOT NULL REFERENCES product_templates(id),
    layers                  JSONB NOT NULL DEFAULT '[]',
    -- layers 示例:
    -- [
    --   {
    --     "print_area_id": "uuid",
    --     "artwork_asset_id": "uuid",
    --     "transform": {"x": 120, "y": 80, "scale": 1.2, "rotation": 0},
    --     "z_index": 1,
    --     "visible": true
    --   }
    -- ]
    editor_session_id       UUID,
    finalized_at            TIMESTAMPTZ,           -- 确认完成编辑
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
```

#### preview_assets

```sql
CREATE TABLE preview_assets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_configuration_id UUID NOT NULL REFERENCES product_configurations(id),
    preview_type            VARCHAR(30) NOT NULL,  -- 'front' / 'back' / 'angle_45' / 'lifestyle'
    file_url                VARCHAR(500) NOT NULL,
    width_px                INT,
    height_px               INT,
    generated_at            TIMESTAMPTZ DEFAULT now()
);
```

#### print_assets

```sql
CREATE TABLE print_assets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_configuration_id UUID NOT NULL REFERENCES product_configurations(id),
    print_area_id           UUID NOT NULL REFERENCES print_areas(id),
    file_url                VARCHAR(500) NOT NULL,
    file_format             VARCHAR(10) DEFAULT 'PDF',  -- PDF / PNG / TIFF
    dpi                     INT DEFAULT 300,
    color_profile           VARCHAR(30) DEFAULT 'CMYK',
    file_size               BIGINT,
    generated_at            TIMESTAMPTZ DEFAULT now()
);
```

### C.6 Sellable Product & Channel Tables

#### sellable_product_instances

```sql
CREATE TABLE sellable_product_instances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id              UUID NOT NULL REFERENCES creators(id),
    design_id               UUID NOT NULL REFERENCES designs(id),
    design_version_id       UUID NOT NULL REFERENCES design_versions(id),
    product_template_id     UUID NOT NULL REFERENCES product_templates(id),
    title                   VARCHAR(255),               -- 可售产品标题（可自定义）
    description             TEXT,
    status                  VARCHAR(20) DEFAULT 'draft', -- draft/ready/listed/paused/archived
    base_price_suggestion   DECIMAL(10,2),              -- 系统建议零售价
    print_file_url          VARCHAR(500),               -- 最终印刷文件引用（来自 Design Engine）
    preview_urls            JSONB DEFAULT '[]',         -- 预览图 URL 列表（来自 Design Engine）
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_spi_creator ON sellable_product_instances(creator_id);
CREATE INDEX idx_spi_design ON sellable_product_instances(design_id);
```

#### channel_listings

```sql
CREATE TABLE channel_listings (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sellable_product_instance_id    UUID NOT NULL REFERENCES sellable_product_instances(id),
    channel_type                    VARCHAR(30) NOT NULL,   -- 'marketplace' / 'creator_store'
    creator_store_connection_id     UUID REFERENCES creator_store_connections(id),  -- NULL = marketplace
    external_product_id             VARCHAR(200),           -- 外部渠道的 product ID
    external_listing_url            VARCHAR(500),
    price                           DECIMAL(10,2) NOT NULL,
    compare_at_price                DECIMAL(10,2),
    currency                        VARCHAR(3) DEFAULT 'USD',
    status                          VARCHAR(20) DEFAULT 'draft', -- draft/pending/active/paused/error/removed
    published_at                    TIMESTAMPTZ,
    error_message                   TEXT,
    metadata                        JSONB DEFAULT '{}',
    created_at                      TIMESTAMPTZ DEFAULT now(),
    updated_at                      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sellable_product_instance_id, channel_type, creator_store_connection_id)
);
```

#### sync_jobs

```sql
CREATE TABLE sync_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id  UUID NOT NULL REFERENCES channel_listings(id),
    action              VARCHAR(20) NOT NULL,   -- 'create' / 'update' / 'delete' / 'sync_inventory'
    status              VARCHAR(20) DEFAULT 'pending', -- pending/processing/completed/failed/retrying
    attempts            INT DEFAULT 0,
    max_attempts        INT DEFAULT 3,
    request_payload     JSONB,
    response_payload    JSONB,
    error_message       TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    next_retry_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status) WHERE status IN ('pending', 'retrying');
```

#### publishing_records (审计日志)

```sql
CREATE TABLE publishing_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_listing_id  UUID NOT NULL REFERENCES channel_listings(id),
    action              VARCHAR(30) NOT NULL,   -- 'publish' / 'unpublish' / 'price_change' / 'sync'
    actor_type          VARCHAR(20) NOT NULL,   -- 'creator' / 'system' / 'admin'
    actor_id            UUID,
    before_state        JSONB,
    after_state         JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);
```

---

## D. 核心流程设计

### D.1 Creator 上传 Design

```
Creator 操作                        系统处理
─────────                          ─────────
1. 进入 Design Management
2. 点击 "Upload New Design"
3. 上传 artwork 文件               → 文件上传至 S3，生成 design_asset 记录
4. (可选) 上传 source file         → 存储为附加 asset
5. 填写标题/描述/标签              → 创建 design 记录（status=draft）
6. 系统自动创建 version 1          → 创建 design_version + 关联 assets
7. (可选) 提交审核                 → status 变为 pending_review
8. 管理员审核通过                  → status 变为 approved，creator 可继续建品
```

**关键决策**：Design 上传后是 draft 状态。只有 approved 状态的 design 才能用于创建可售产品。如果初期不需要审核流程，可以设置自动审核通过。

### D.2 Creator 选择产品模板

```
Creator 操作                        系统处理
─────────                          ─────────
1. 在某个 design 下点击
   "Create Product"
2. 看到可用产品模板列表             ← Creator Portal 调用 ERP API
   (T-shirt, Mug, Hat...)            GET /api/erp/product-templates?status=active
3. 选择一个模板（如 Classic Tee）
4. 系统自动生成初步 preview         ← Design Engine: 将 artwork 居中放置到模板
                                      默认 transform，生成快速预览
5. Creator 看到 preview
6. Creator 满意 → 确认              → 创建 sellable_product_instance (status=draft)
                                    → 创建初步 product_configuration
   Creator 想微调 → 进入编辑器      → 进入 D.3 流程
```

### D.3 Creator 进入 Design Editor 编辑

```
Creator 操作                        系统处理
─────────                          ─────────
1. 点击 "Edit in Designer"
2.                                  → Creator Portal 调用 Design Engine:
                                      POST /api/design-engine/sessions
                                      {
                                        creator_id, design_version_id,
                                        product_template_id,
                                        sellable_product_instance_id (如已有)
                                      }
                                    ← 返回 session_id + editor_url
3. Editor 以 iframe 方式加载        → iframe src=editor_url?session=xxx&token=yyy
4. Editor 加载:
   - 产品底图
   - 印刷区域 overlay
   - 当前 artwork
   - 已有 configuration (如有)
5. Creator 编辑:
   - 拖拽调整位置
   - 缩放
   - 旋转
   - 适配 print area
6. Creator 点击 "Save"              → Editor 通过 postMessage 通知 Portal
                                    → Design Engine 保存:
                                      PUT /api/design-engine/sessions/:id/save
                                      更新 product_configurations
7. Creator 点击 "Generate Preview"  → POST /api/design-engine/preview/generate
                                    → 异步生成 mockup，写入 preview_assets
8. Creator 点击 "Done"              → Editor 通过 postMessage 通知 Portal
                                    → Portal 关闭 iframe，刷新产品页
```

### D.4 保存 Product Configuration

```
Design Engine 内部:
1. 收到 save 请求
2. 从 editor session 提取当前状态:
   - 每个 print_area 上的 artwork 位置 (x, y)
   - 缩放比例 (scale)
   - 旋转角度 (rotation)
   - 图层信息 (z_index, visibility)
3. 写入 / 更新 product_configurations 表
4. 标记 editor_session 为 saved
5. (如果请求了 preview) 触发 preview 异步生成
6. (如果请求了 print file) 触发 print file 异步生成
```

### D.5 Creator 选择 Channel 并设置价格

```
Creator 操作                        系统处理
─────────                          ─────────
1. 在 Product Builder 中，
   产品配置完成后，
   进入 "Distribution" 步骤
2. 看到渠道选项:
   □ Our Marketplace
   □ My Store (Shopify)              ← 如果已连接 store 才可选
3. 勾选渠道
4. 分别设置价格:
   - Marketplace: $29               → 创建 channel_listing (channel_type='marketplace')
   - My Store: $35                  → 创建 channel_listing (channel_type='creator_store')
5. 系统展示收入预估:
   - Marketplace: royalty $X        ← 根据 royalty 规则计算
   - My Store: margin $Y            ← 售价 - 成本
6. Creator 确认发布                 → 更新 sellable_product_instance status='listed'
                                    → 触发各渠道的 sync_job
```

### D.6 发布到 Marketplace

```
数据流: Creator Portal → 触发 sync_job → Channel Sync Gateway → 从 ERP 读取数据 → 推送到我方 Shopify

系统处理:
1. Creator 在 Portal 确认发布
2. channel_listing (marketplace) status → 'pending'
3. 创建 sync_job (action='create')
4. Channel Sync Gateway 处理:
   a. 从 ERP 读取产品数据:
      - 产品名称、描述 (from ERP products/product_templates)
      - SKU variants、库存 (from ERP skus/inventory)
      - preview 图片 (from preview_assets)
   b. 合并 channel_listing 中的价格设置
   c. 使用我方 Shopify store credentials
   d. 调用 Shopify API 创建 Product
   e. 记录 external_product_id
5. 成功 → channel_listing status='active', published_at=now()
   失败 → channel_listing status='error', 记录 error_message
6. 写入 publishing_record
```

### D.7 同步到 Creator 自己的 Store

```
数据流: Creator Portal → 触发 sync_job → Channel Sync Gateway → 从 ERP 读取数据 → 推送到 Creator 的 Shopify

与 D.6 流程完全一致，区别仅在于:
- 使用 creator_store_connection 中的 credentials（而非我方 store credentials）
- 使用 creator 为该渠道设置的价格

系统处理:
1. Creator 在 Portal 确认同步到自己的 Store
2. channel_listing (creator_store) status → 'pending'
3. 验证 creator_store_connection 有效（token 未过期）
4. 创建 sync_job (action='create')
5. Channel Sync Gateway 处理:
   a. 从 ERP 读取同样的产品/SKU/库存数据
   b. 合并 channel_listing 中 creator 设置的价格
   c. 使用 creator 的 store access_token
   d. 调用 Shopify API 创建 Product
   e. 记录 external_product_id
6. 成功 → channel_listing status='active'
   失败 → 重试或标记 error
7. 写入 publishing_record
```

**关键认知：D.6 和 D.7 本质上是同一条流程。Channel Sync Gateway 不关心目标 store 是谁的，它只关心：从 ERP 拿什么数据、用哪套 credentials 推到哪个 store。这正是 adapter 模式的价值。**

### D.8 订单回流到 ERP

```
数据流: 外部 Shopify Store → Webhook → Channel Sync Gateway → 写入 ERP

无论订单来自我方 Shopify 还是 Creator 的 Shopify，回流路径一致:

1. Shopify Webhook → order/create → Channel Sync Gateway Webhook Handler
2. Gateway 识别来源:
   - 通过 webhook 注册信息匹配到 store_connection
   - 确定 channel_type (marketplace / creator_store)
   - 匹配 external_product_id → channel_listing → sellable_product_instance → creator_id → erp_partner_id
3. Gateway 调用 ERP API 创建订单:
   - POST /api/erp/orders
   - 包含: source, channel_type, partner_id, customer info, line items (含 design_id, print_file_url 等快照), shipping address
4. ERP 处理:
   - 创建 order (source 区分来源)
   - 创建 order_items (关联 sku, sellable_product_instance, channel_listing)
   - 预留库存
   - Event: ORDER_CREATED → 触发履约流程、earnings 计算
```

### D.9 Creator Earnings / Royalties / Payouts 计算

```
收入模型:
─────────
A. Marketplace (Mode A):
   Creator 收入 = 售价 × royalty_rate
   平台保留 = 售价 - 生产成本 - creator royalty

   例：售价 $29, 成本 $8, royalty_rate 15%
   → Creator 得 $4.35
   → 平台得 $29 - $8 - $4.35 = $16.65

B. Creator Store (Mode B):
   Creator 收入 = 售价 - 生产成本 - 平台服务费

   例：售价 $35, 成本 $8, 服务费率 5%
   → 平台服务费 $35 × 5% = $1.75
   → Creator 得 $35 - $8 - $1.75 = $25.25

处理流程:
─────────
1. 订单确认（或发货后）→ Event: ORDER_CONFIRMED
2. ERP Earnings Calculator 消费事件:
   a. 查询 order_item 上的 partner_id + channel_type
   b. 读取 partners 表的 settlement_terms 确定计算规则
   c. 写入 payout_ledger (partner_id, status='pending')
3. 定期结算 (e.g. 每月1号):
   a. 按 partner_id 汇总上月所有 pending 的 payout_ledger
   b. 创建 settlement_ledger 记录
   c. Event: SETTLEMENT_CREATED → Creator Commerce 同步更新 creator_earnings_summary
4. 财务确认并发起打款:
   a. settlement_ledger status → 'processing' → 'paid'
   b. 根据 partners.payment_info 打款
   c. 记录 payment_ref
   d. Event: PAYOUT_COMPLETED → Creator Commerce 通知 creator
```

---

## E. Design Engine 接入方案

### E.1 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **iframe Embedded** | 隔离性好、独立部署、跨系统复用最简单 | 跨域通信需 postMessage、样式隔离但不易统一 | **短期首选** |
| Micro-frontend (Module Federation) | 共享运行时、样式可统一、性能好 | 构建耦合、版本协调复杂 | 中期演进 |
| Standalone App + Token | 完全独立、可给外部使用 | 体验割裂（跳转新页面） | 外部开放 |
| Internal Module | 开发简单、体验最一体化 | 无法复用给其他系统、耦合度高 | 不推荐 |

### E.2 推荐路线

**短期 (Phase 1): iframe Embedded**

```
Creator Portal                    Design Engine
┌──────────────────┐             ┌──────────────────┐
│                  │  iframe     │                  │
│  Product Builder │◄──────────►│  Editor App      │
│                  │  postMsg   │                  │
│  ┌────────────┐  │             │  独立部署         │
│  │  iframe     │  │             │  独立域名         │
│  │  editor.    │  │             │  /editor?session= │
│  │  domain.com │  │             │  &token=          │
│  └────────────┘  │             │                  │
└──────────────────┘             └──────────────────┘
```

通信协议设计:

```typescript
// Portal → Editor (通过 iframe postMessage)
interface EditorInitMessage {
  type: 'INIT_EDITOR';
  payload: {
    sessionId: string;
    token: string;           // 短期 JWT
    theme: 'light' | 'dark'; // 统一主题
    locale: string;
  };
}

// Editor → Portal (通过 postMessage)
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

统一体验策略:
- Editor 支持主题参数，Portal 传入品牌色/主题
- Editor 隐藏自身导航栏，只显示画布和工具栏
- Loading 状态由 Portal 统一管理

**长期 (Phase 3): Micro-frontend + SDK**

```
Phase 3 演进:
1. 提取 Design Engine SDK (npm package)
   - @company/design-engine-sdk
   - 提供 React 组件: <DesignEditor />
   - 提供 headless API client
2. 支持 Module Federation 方式嵌入
3. SDK 可供外部系统使用（开放平台场景）
```

---

## F. API / Service 边界设计

### F.1 Creator Portal API (BFF 层)

Creator Portal 的后端作为 BFF (Backend for Frontend)，聚合来自各系统的数据。

#### Creator 身份与 Profile

```
POST   /api/creators/register            注册
POST   /api/creators/login               登录
GET    /api/creators/me                   获取当前 creator 信息
PUT    /api/creators/me/profile           更新 profile
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
GET    /api/designs/:id/stats             设计表现数据
```

#### Product Builder

```
GET    /api/product-templates              获取可用产品模板（来自 ERP）
GET    /api/product-templates/:id          模板详情（含 print areas）
POST   /api/sellable-products              创建可售产品实例
GET    /api/sellable-products              列表
GET    /api/sellable-products/:id          详情
PUT    /api/sellable-products/:id          更新
```

#### Design Editor Integration

```
POST   /api/editor/sessions                创建编辑 session → 调 Design Engine
GET    /api/editor/sessions/:id            获取 session 状态
POST   /api/editor/sessions/:id/finalize   确认编辑完成
```

#### Channel Distribution

```
POST   /api/channel-listings                         创建渠道 listing
GET    /api/channel-listings?product_instance_id=     查询某产品的所有 listing
PUT    /api/channel-listings/:id                      更新（改价格等）
POST   /api/channel-listings/:id/publish              发布
POST   /api/channel-listings/:id/unpublish            下架
GET    /api/channel-listings/:id/sync-status           同步状态
```

#### Store Connection

```
POST   /api/store-connections/shopify/auth-url         获取 Shopify OAuth URL
POST   /api/store-connections/shopify/callback          OAuth 回调
GET    /api/store-connections                           列表
DELETE /api/store-connections/:id                       断开连接
POST   /api/store-connections/:id/test                  测试连接
```

#### Orders & Earnings

```
GET    /api/orders                          creator 的订单 (支持 channel/design/product 筛选)
GET    /api/orders/:id                      订单详情
GET    /api/earnings/summary                收入总览 (today/month/total/pending/settled)
GET    /api/earnings/by-period              按周期收入
GET    /api/earnings/by-channel             按渠道收入
GET    /api/earnings/by-design              按 design 收入
GET    /api/payouts                         Payout 列表
GET    /api/payouts/:id                     Payout 详情
```

#### Dashboard

```
GET    /api/dashboard/overview              聚合数据: 收入、订单、top designs
GET    /api/dashboard/top-designs           Top selling designs
GET    /api/dashboard/top-products          Top selling products
GET    /api/dashboard/channel-performance   渠道表现对比
```

### F.2 Admin 管理后台 API

> Admin 和 Portal 可共享同一套后端 API 服务，通过角色权限区分。Admin 路由需要内部员工身份认证（SSO/RBAC）。

```
# Creator 管理
GET    /api/admin/creators                     Creator 列表（支持状态/搜索筛选）
GET    /api/admin/creators/:id                 Creator 详情（含 profile、store 连接、统计）
PUT    /api/admin/creators/:id/status          审核/暂停/封禁 creator
PUT    /api/admin/creators/:id                 编辑 creator 信息

# 设计审核
GET    /api/admin/designs                      待审核/全部 design 列表
GET    /api/admin/designs/:id                  Design 详情（含 assets、版本历史）
POST   /api/admin/designs/:id/approve          审核通过
POST   /api/admin/designs/:id/reject           审核拒绝（附拒绝原因）

# 产品管理
GET    /api/admin/sellable-products            所有可售产品列表
PUT    /api/admin/sellable-products/:id/status 强制下架/恢复

# 渠道监控
GET    /api/admin/channel-listings             所有 listing 列表（支持状态筛选）
GET    /api/admin/sync-jobs                    同步任务列表（支持状态筛选）
POST   /api/admin/sync-jobs/:id/retry          手动重试失败的同步

# 订单（从 ERP 读取）
GET    /api/admin/orders                       全局订单列表（支持 creator/渠道/状态筛选）
GET    /api/admin/orders/:id                   订单详情

# 结算管理（调 ERP API）
GET    /api/admin/earnings                     全局 earnings 列表
GET    /api/admin/settlements                  结算记录列表
POST   /api/admin/settlements/:id/confirm      确认打款
PUT    /api/admin/payouts/:id/adjust           调整 payout 金额（需审计记录）

# 运营配置
GET    /api/admin/config                       获取运营配置
PUT    /api/admin/config/royalty-rates          设置 royalty rate
PUT    /api/admin/config/service-fees           设置 service fee rate

# 数据看板
GET    /api/admin/dashboard/overview           全局总览（GMV、活跃 creator、订单量）
GET    /api/admin/dashboard/creators           Creator 排行
GET    /api/admin/dashboard/channels           渠道 GMV 对比
```

### F.3 Design Engine Internal API

```
POST   /api/design-engine/sessions                 创建编辑 session
GET    /api/design-engine/sessions/:id             获取 session（含完整状态）
PUT    /api/design-engine/sessions/:id/save        保存编辑状态
DELETE /api/design-engine/sessions/:id             关闭 session

GET    /api/design-engine/templates/:id            获取模板配置
GET    /api/design-engine/templates/:id/print-areas 获取印刷区域

POST   /api/design-engine/configurations           创建/更新产品配置
GET    /api/design-engine/configurations/:id       获取配置

POST   /api/design-engine/preview/generate         生成 preview/mockup（异步）
GET    /api/design-engine/preview/:id/status        查询生成状态
POST   /api/design-engine/print-file/generate      生成印刷文件（异步）
GET    /api/design-engine/print-file/:id/status     查询生成状态
```

### F.4 ERP Core API (供 Creator Commerce 调用)

```
GET    /api/erp/products                    产品列表
GET    /api/erp/products/:id               产品详情
GET    /api/erp/product-templates           产品模板列表
GET    /api/erp/product-templates/:id       模板详情
GET    /api/erp/skus?product_id=            SKU 列表

POST   /api/erp/orders                     创建订单（由 Sync Gateway 调用）
GET    /api/erp/orders?partner_id=           查询某 partner 的订单
GET    /api/erp/orders/:id                 订单详情

GET    /api/erp/partners/:id               获取 partner 信息（settlement terms 等）
GET    /api/erp/payout-ledger?partner_id=   Partner 收入明细
GET    /api/erp/settlements?partner_id=      结算记录
```

### F.5 Channel Sync Gateway API (内部)

Gateway 作为 ERP 的渠道桥梁，所有数据从 ERP 读取后推送到外部 store，外部订单回流写入 ERP。

```
# Listing 同步（ERP 数据 → 外部渠道）
POST   /api/sync/listings                  推送 listing 到渠道（Gateway 从 ERP 读取产品/SKU/库存）
PUT    /api/sync/listings/:id              更新 listing（价格变更、库存同步）
DELETE /api/sync/listings/:id              删除/下架 listing
POST   /api/sync/listings/:id/retry        重试失败的同步

# 库存同步（ERP 库存变更 → 推送到相关渠道）
POST   /api/sync/inventory/push            ERP 库存变更后触发，更新所有相关渠道的库存

# Webhook 入口（外部渠道 → 写入 ERP）
POST   /api/sync/webhooks/shopify          Shopify Webhook 入口（订单/退款等 → 写入 ERP）
POST   /api/sync/webhooks/:platform        通用 Webhook 入口
```

---

## G. 版本路线图

### Phase 1: 最小可运行版本 (MVP)

**目标**：Creator 可以上传设计、选品、编辑、在我们的 Marketplace 上发布销售，看到基本收入。

| 模块 | 功能范围 |
|------|---------|
| Creator Auth | 注册、登录、基础 profile |
| Design Management | 上传 artwork、管理 metadata、状态流转（简化审核：自动通过） |
| Product Builder | 支持 2-3 个产品模板（T-shirt、Mug）、自动生成 preview |
| Design Editor | iframe 嵌入、基础编辑（移动/缩放/旋转）、保存配置 |
| Channel Distribution | **仅 Marketplace**（Mode A）、单一价格设置、发布到我们的 Shopify |
| Orders | Creator 查看自己的 Marketplace 订单 |
| Earnings | 基础 royalty 计算、收入总览（不含提现） |
| Dashboard | 简单总览：总收入、总订单、top designs |

**Phase 1 不做**：
- Creator 自有 store 连接
- Mode B / Hybrid
- Payout 打款流程
- 高级 analytics
- 多渠道

**预计交付物**：
- Creator Portal 前端 (Next.js / React)
- Creator Portal BFF 后端
- Design Engine 基础 API + Editor iframe
- ERP 侧新增 payout_ledger 表 + 基础 API
- Channel Sync Gateway (仅 Shopify marketplace adapter)
- 数据库完整 schema (按上述设计建表，即使 Phase 1 不用的字段也预留)

### Phase 2: 渠道与同步增强

**目标**：支持 Creator 连接自己的 Shopify Store，实现 Mode B 和 Hybrid。

| 模块 | 新增功能 |
|------|---------|
| Store Connection | Shopify OAuth 连接流程、连接状态管理、自动刷新 token |
| Channel Distribution | Mode B: 同步到 creator store、Hybrid: 两个渠道同时上架、per-channel 独立定价 |
| Sync Engine | Creator store sync adapter、sync job 队列/重试/状态追踪、Webhook 处理（creator store 订单回流） |
| Earnings | Mode B margin 计算、双渠道收入对比、收入明细按渠道拆分 |
| Payouts | 结算周期管理、Payout 状态追踪、（对接支付渠道可后置） |
| Dashboard | 渠道表现对比、按渠道维度的 analytics |
| Design Editor | 增强：更多编辑功能（多图层、文字叠加等） |

### Phase 3: Creator 生态化

**目标**：丰富产品线，扩展渠道，构建 creator 生态。

| 模块 | 新增功能 |
|------|---------|
| Product Templates | 更多模板：Hat、Tote Bag、Phone Case、Poster... |
| Channels | TikTok Shop adapter、Etsy adapter、通用 API adapter |
| Creator Tiers | Creator 等级体系、不同等级不同 royalty rate、邀请机制 |
| Advanced Analytics | Design 表现趋势、A/B 测试建议、渠道 ROI 分析 |
| Batch Operations | 批量上架/下架、批量改价 |
| Design Engine SDK | 发布 npm SDK、支持 Module Federation、外部系统接入文档 |
| Open API | 开放 API 给 creator 自行集成、Webhook 通知 |
| Payout 自动化 | 对接 Stripe Connect / PayPal Payouts、自动打款 |

---

## H. 技术选型建议

| 层级 | 建议技术栈 | 备注 |
|------|-----------|------|
| Creator Portal Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui | 本项目开发 |
| Creator Portal BFF | Next.js API Routes 或独立 Node.js (Fastify/Express) | 本项目开发 |
| Design Engine Editor | React + Canvas API (Fabric.js / Konva.js) 或 WebGL | 已有 Node.js MVP，继续迭代 |
| Design Engine Backend | Node.js (独立 service) | 本项目开发，补 API 层 |
| ERP Core | Java（已有），暴露 REST API | 不在本项目范围，我们只调 API |
| Channel Sync Gateway | Node.js + Bull/BullMQ (Job Queue) + Redis | 本项目开发 |
| Database | **Supabase** (PostgreSQL，含 Auth/Storage/RLS) + Redis (缓存/队列) | 与 ERP DB 完全独立 |
| File Storage | AWS S3 / Cloudflare R2 | |
| Event Bus | Redis Streams 或 RabbitMQ（初期用 Bull job events 即可） | |
| Auth | Supabase Auth（Creator 独立身份体系，支持 email/password + OAuth） | |
| 部署 | Docker + Vercel (Portal) / AWS ECS (Engine, Sync) | |

---

## I. 风险提醒

### 最危险的架构误区

1. **把 Creator 系统做成 ERP 的一个页面**
   Creator Portal 是面向外部用户的产品，交互逻辑、权限模型、数据视角都不同于内部 ERP。如果塞进 ERP，会导致 UX 妥协和权限混乱。

2. **Design 和 Product Instance 不做区分**
   一个 Design 可以应用到多个产品模板上，生成多个可售实例。如果把 design 和 product 混为一谈，后面多模板/多渠道场景全部要重构。

3. **把 Design Engine 写死在 Creator Portal 里**
   编辑器如果作为 Portal 的内部组件开发，未来给其他系统复用时需要整体重写。从 Day 1 保持独立部署和独立 API。

4. **渠道逻辑硬编码**
   如果只按 "Shopify" 来写，加 TikTok/Etsy 时要大改。应该抽象为 channel_type + adapter 模式。

5. **Earnings 计算不走 Ledger**
   不要在展示层直接用订单数据计算收入。必须有独立的 payout_ledger 做为可审计的财务底账，展示层只读 ledger 数据。

### 现在最应该优先做的 3 件事

1. **确定数据模型并建表** — Creator Commerce DB 中 Design → Product Configuration → Sellable Product Instance → Channel Listing 这条主线的表结构必须第一时间确认，它决定了所有后续开发。

2. **给现有 Design Engine MVP 补 API 层** — 把"导出 JSON"变成"保存 product_configuration 到数据库"，把"下载预览图"变成"写入 S3 + 返回 URL"。然后验证 iframe 嵌入 + postMessage 通信。

3. **跑通 Phase 1 核心链路** — Creator 上传 design → 选模板 → 编辑 → 发布到 Marketplace → 调 ERP API 创建订单 → 看到收入。先端到端跑通，再横向扩展功能。

### 短期先简化 vs Day 1 必须设计对

| 可以短期简化 | Day 1 必须对 |
|-------------|-------------|
| 审核流程（自动通过） | Design / ProductInstance / Listing 三层数据分离 |
| 仅支持 Marketplace 渠道 | channel_type 字段和 adapter 抽象 |
| Payout 不做自动打款（人工处理） | payout_ledger 独立表结构 |
| 只支持 2-3 个模板 | product_template + print_areas 的通用结构 |
| Dashboard 简化展示 | earnings 从 ledger 读取而非订单直算 |
| 不做 creator tier | creators 表预留 tier/level 字段 |
| Design Engine 仅 iframe 嵌入 | Design Engine 独立部署 + 独立 API |
| | Design 内容管理归 Creator Portal，ERP 只存引用不存内容 |
| | Creator 在 ERP 中是 partner 类型，不单独建 module；通用 partners 表 + settlement_terms |
