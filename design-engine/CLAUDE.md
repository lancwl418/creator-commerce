# Ideamizer — POD 可嵌入式 2D 设计编辑器

## 项目概述

面向 Print on Demand 的**可嵌入式** 2D 画布编辑器。核心定位：**独立编辑器 + 双向数据接口**。

- **Input 开口**：从 ERP 系统、Shopify 等外部平台获取产品 blank 数据（转换为统一的 `ProductTemplate`）
- **Editor 核心**：用户在 blank 的可印区域上设计图案（上传图片/添加文字/调整位置大小旋转）
- **Output 开口**：输出 `DesignDocument` JSON + PNG 预览图，通过回调传回宿主平台，用于发布到 Shopify/Etsy 等

编辑器支持三种运行模式：
- `embedded` — 单产品嵌入（宿主传入一个 ProductTemplate，隐藏产品选择器）
- `standalone` — 自定义 API（宿主提供产品列表接口 URL）
- `demo` — 演示模式（加载内置模板 + 异步获取 Shopify/ERP 产品）

## 技术栈

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict mode)
- **Fabric.js v7** — 2D canvas 引擎 (仅客户端，必须 `ssr: false`)
- **Zustand 5 + zundo 2** — 状态管理 + undo/redo
- **Tailwind CSS v4** — 样式 (通过 `@tailwindcss/postcss`)
- **lucide-react** — 图标库
- **@dnd-kit** — 拖拽排序
- **react-dropzone** — 文件上传
- **nanoid** — ID 生成

## 项目结构

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # 主入口 (demo 模式)
│   ├── embed/page.tsx          # 嵌入入口 (embedded/standalone 模式)
│   ├── demo/page.tsx           # 模式演示页
│   └── api/
│       ├── erp-products/       # ERP 产品列表代理
│       ├── shopify-products/   # Shopify 产品列表代理
│       ├── erp-image/          # ERP 图片 CORS 代理
│       └── templates/          # Mock 模板 API (standalone 测试)
├── components/
│   ├── editor/                 # 编辑器 UI 组件
│   │   ├── EditorPage.tsx      # 编辑器主页面 (组合所有面板)
│   │   ├── EditorShell.tsx     # SSR 安全包装 (dynamic ssr:false)
│   │   ├── EditorCanvas.tsx    # Fabric.js canvas + 事件监听
│   │   ├── EditorConfigContext.tsx  # 编辑器模式配置上下文
│   │   ├── ProductSelector.tsx # 产品/模板选择 + 视图切换
│   │   ├── DesignUploader.tsx  # 图片上传
│   │   ├── Toolbar.tsx         # 工具栏 (导出/撤销/对齐/翻转)
│   │   ├── LayerPanel.tsx      # 图层面板
│   │   ├── PropertiesPanel.tsx # 属性面板
│   │   ├── PrintableAreaEditor.tsx  # 可印区域可视化编辑
│   │   └── ValidationDialog.tsx     # 导出前验证弹窗
│   └── ui/                     # 通用 UI 组件
├── core/                       # 框架无关的核心业务逻辑
│   ├── canvas/
│   │   ├── CanvasManager.ts    # Fabric.js 生命周期、图层操作
│   │   ├── ClipRegionManager.ts # 可印区域裁剪 (clipPath)
│   │   ├── ObjectFactory.ts    # DesignLayer → Fabric 对象工厂
│   │   ├── CanvasSerializer.ts # Canvas ↔ DesignJSON 双向转换
│   │   ├── AlignmentService.ts # 对齐计算
│   │   ├── GridManager.ts      # 网格显示
│   │   ├── DpiCalculator.ts    # DPI/分辨率计算
│   │   └── BackgroundRemovalService.ts  # 背景移除
│   ├── design/
│   │   ├── ExportService.ts    # JSON/PNG 导出 + localStorage 持久化
│   │   └── DesignValidator.ts  # 设计验证
│   └── templates/
│       ├── ProductTemplateRegistry.ts  # 内置模板注册表
│       ├── TemplateValidator.ts        # 模板 schema 验证
│       ├── definitions/        # 内置产品模板
│       │   ├── tshirt.template.ts
│       │   ├── mug.template.ts
│       │   └── phonecase.template.ts
│       └── converters/         # 外部数据 → ProductTemplate 转换器
│           ├── erpProductConverter.ts
│           └── shopifyProductConverter.ts
├── stores/                     # Zustand stores
│   ├── designStore.ts          # DesignDocument (source of truth) + undo/redo
│   ├── productStore.ts         # 产品模板选择 + 视图状态
│   └── editorStore.ts          # UI 状态 (缩放/选中/网格/工具)
├── hooks/
│   ├── useCanvas.ts            # CanvasManager 生命周期
│   ├── useTemplateLoader.ts    # 模板加载编排 (按模式分流)
│   ├── useHistory.ts           # undo/redo 封装
│   └── useKeyboardShortcuts.ts # 快捷键处理
├── plugins/
│   └── PluginManager.ts        # 插件注册与生命周期管理
├── lib/
│   ├── cn.ts                   # Tailwind class 合并
│   ├── id.ts                   # nanoid 封装
│   └── erpImageUrl.ts          # ERP 图片 URL 解析
└── types/
    ├── design.ts               # DesignDocument, DesignLayer, DesignView
    ├── product.ts              # ProductTemplate, ProductView, PrintableArea
    ├── editor.ts               # 编辑器 UI 状态类型
    ├── editor-config.ts        # EditorConfig (模式 + 回调)
    ├── plugin.ts               # IdeamizerPlugin, PluginContext, PluginHooks
    ├── erp-product.ts          # ERP API 响应类型
    ├── shopify-product.ts      # Shopify API 响应类型
    └── fabric-extensions.d.ts  # Fabric.js 类型扩展
```

## 架构原则

### 1. 双向数据接口

编辑器是一个独立组件，通过统一接口与外部系统对接：

- **Input**：任何数据源的产品数据，经 Converter 转为 `ProductTemplate` → `productStore`
- **Output**：设计完成后通过 `EditorConfig.onExport(json, png)` 回调传回宿主

新增数据源只需写一个 Converter（`XxxProduct → ProductTemplate`），编辑器核心代码不需要修改。

### 2. DesignDocument 是 source of truth

- Zustand `designStore` 持有 `DesignDocument`，Fabric.js canvas 是它的视图
- 所有设计操作先更新 store，再同步到 canvas
- JSON 序列化/反序列化必须完全可逆

### 3. CanvasManager 是纯 TypeScript 类

- 不依赖 React，React 组件只是薄壳委托给它
- 方便测试和未来在非 React 环境复用 (如服务端渲染缩略图)

### 4. 三种编辑器模式

| 模式 | 入口 | 产品来源 | 产品选择器 | 使用场景 |
|------|------|----------|-----------|---------|
| `demo` | `/` | 内置模板 + Shopify/ERP API | 显示 | 独立使用/演示 |
| `embedded` | `/embed?template={json}` | 宿主传入单个 ProductTemplate | 隐藏 | 嵌入 Shopify admin 等 |
| `standalone` | `/embed?api={url}` | 自定义 API 返回 ProductTemplate[] | 显示 | 多租户/白标部署 |

配置通过 `EditorConfigContext` 传递，组件通过 `useEditorConfig()` 访问。

### 5. 插件通过 PluginContext 访问系统

- 插件永远不直接 import stores 或 components
- 通过 `PluginContext` 接口交互，保证核心与插件解耦
- 编辑器永远不 import `plugins/shopify/` 或 `plugins/etsy/`

### 6. Fabric.js 必须客户端加载

- 使用 `next/dynamic` + `ssr: false` 包装 (见 `EditorShell.tsx`)
- Fabric.js 类型扩展在 `types/fabric-extensions.d.ts`

## 数据流

### Input 流：外部产品 → 编辑器

```
ERP API / Shopify API / 自定义 API / 内置模板
       ↓
  Converter (erpProductConverter / shopifyProductConverter)
       ↓
  ProductTemplate (统一格式)
       ↓
  productStore.setTemplates() / appendTemplates() / setEmbeddedTemplate()
       ↓
  ProductSelector UI → 用户选择 → Canvas 渲染 mockup + printableArea
```

### Output 流：设计成品 → 外部平台

```
用户设计完成 → Toolbar 导出按钮
       ↓
  DesignValidator.validate() → ValidationDialog (如有问题)
       ↓
  ExportService.exportJSON(design) + CanvasManager.exportToDataURL()
       ↓
  ┌─ demo 模式: 浏览器下载 JSON/PNG
  └─ embedded/standalone: EditorConfig.onExport(jsonString, pngDataUrl) 回调给宿主
```

### Canvas 内部数据同步

```
用户操作 Canvas
  → Fabric.js object:modified 事件
  → CanvasManager 提取 transform
  → designStore.updateLayer() (更新 source of truth)
  → 同时 editorStore.setSelectedLayerIds() (更新 UI 状态)
```

## 核心类型

```typescript
// 设计文档 — 最终输出
DesignDocument { version, id, name, productTemplateId, views: Record<string, DesignView>, metadata }
DesignView { viewId, layers: DesignLayer[], backgroundColor? }
DesignLayer { id, type, name, visible, locked, opacity, transform: LayerTransform, data: LayerData }
LayerTransform { x, y, width, height, rotation, scaleX, scaleY, flipX, flipY }
LayerType = 'image' | 'text' | 'shape'

// 产品模板 — 统一的 blank 描述
ProductTemplate { id, type, name, description, views: ProductView[], defaultViewId, metadata }
ProductView { id, label, mockupImageUrl, mockupWidth, mockupHeight, printableArea }
PrintableArea { shape, x, y, width, height, physicalWidthInches, physicalHeightInches, minDPI }
ProductType = 'tshirt' | 'mug' | 'phonecase' | string  // 外部模板可用任意类型

// 编辑器配置
EditorConfig { mode, template?, apiEndpoint?, apiHeaders?, onSave?, onExport? }
EditorMode = 'embedded' | 'standalone' | 'demo'

// 插件
IdeamizerPlugin { id, name, version, platform, initialize(ctx), destroy(), hooks }
PluginHooks { beforeExport?, afterExport?, validateDesign?, mapProduct? }
PluginContext { getDesignDocument(), getProductTemplate(), registerUIExtension(), emit(), on() }
```

## 自定义事件

画布组件间通过 `window` 自定义事件通信（避免深层 prop drilling）：

| 事件 | 载荷 | 说明 |
|------|------|------|
| `ideamizer:layer-added` | `DesignLayer` | 新图层添加到画布 |
| `ideamizer:layers-reordered` | `string[]` | 图层重排序 |
| `ideamizer:export-png` | — | 触发 PNG 导出 |
| `ideamizer:layer-transform` | `{layerId, x, y, ...}` | 图层位置变换 (对齐) |
| `ideamizer:layer-flip` | `{layerId, direction}` | 图层翻转 |
| `ideamizer:update-image-src` | `{layerId, src}` | 更新图片源 (背景移除后) |
| `ideamizer:enter-crop` | `layerId` | 进入裁剪模式 |
| `ideamizer:apply-crop` | — | 应用裁剪 |
| `ideamizer:cancel-crop` | — | 取消裁剪 |
| `ideamizer:toggle-grid` | — | 切换网格显示 |
| `ideamizer:toggle-snap` | — | 切换吸附开关 |

## 编码规范

### 命名
- **组件文件**: PascalCase (`EditorPage.tsx`, `LayerPanel.tsx`)
- **工具/类型/store**: camelCase (`designStore.ts`, `useCanvas.ts`)
- **模板文件**: `{product}.template.ts` (`tshirt.template.ts`)
- **转换器文件**: `{source}ProductConverter.ts` (`erpProductConverter.ts`)
- **React hooks**: `use` 前缀 (`useCanvas`, `useHistory`)
- **Store hooks**: `useXxxStore` (`useDesignStore`, `useEditorStore`)
- **事件处理**: `handle` 前缀用于组件内 (`handleExportJSON`)，`on` 前缀用于 props (`onLayerAdded`)

### 导入
- 始终使用 `@/` 路径别名，不使用相对路径
- 类型导入使用 `import type { ... }`
- 导入顺序: React → 第三方库 → @/ 内部模块 → 类型

### 组件
- 客户端组件必须加 `'use client'` 指令
- Props interface 在组件上方内联定义
- 使用 Tailwind 类名，不写独立 CSS 文件
- 使用 `cn()` 工具函数合并条件类名

### 状态管理
- 设计状态用 `designStore` (有 zundo undo/redo，history limit = 50)
- UI 状态用 `editorStore` (无需 undo)
- 产品选择用 `productStore`
- 跨组件通信优先用 Zustand store，画布事件用 `CustomEvent`

## 常用命令

```bash
node node_modules/next/dist/bin/next dev    # 开发服务器 (Node 24 需直接调用)
node node_modules/next/dist/bin/next build  # 生产构建
npm run lint                                # ESLint 检查
```

> 注意: 由于 Node.js v24 与 Next.js 16 的兼容问题，`npm run dev` / `npm run build` 可能失败，需使用 `node node_modules/next/dist/bin/next` 直接调用。

## 添加新数据源 (新 Converter)

1. 在 `types/` 创建 `{source}-product.ts` 定义外部 API 响应类型
2. 在 `core/templates/converters/` 创建 `{source}ProductConverter.ts`
3. 实现 `convertXxxProduct(raw) → ProductTemplate` 转换函数
4. 在 `app/api/{source}-products/` 创建 Next.js API 代理路由（处理 CORS/鉴权）
5. 在 `hooks/useTemplateLoader.ts` 中添加 fetch + 转换调用
6. 如需图片代理，在 `app/api/{source}-image/` 创建代理路由

## 添加新产品模板 (内置)

1. 在 `core/templates/definitions/` 创建 `{product}.template.ts`
2. 导出 `ProductTemplate` 对象 (定义 views + printableArea)
3. 在 `ProductTemplateRegistry.ts` 的 constructor 中 `this.register(template)`
4. 在 `public/templates/` 放入对应 mockup 图片 (SVG/PNG)
5. 在 `ProductSelector.tsx` 的 `productIcons` 中添加图标映射

## 添加新插件

1. 在 `plugins/{platform}/` 创建插件目录
2. 实现 `IdeamizerPlugin` 接口
3. 通过 `PluginManager.register()` 注册
4. 插件只通过 `PluginContext` API 与核心交互

## 待开发

- [ ] **postMessage 通信** — iframe 嵌入场景下的双向消息协议
- [ ] **结构化 DesignResult** — 包含 preview 缩略图 + metadata 的打包导出格式
- [ ] **多视图批量预览** — 每个 view 独立导出 preview
- [ ] **实际平台插件** — Shopify/Etsy 插件的具体实现
- [ ] **publishToPlatform hook** — 插件将设计推送到平台的能力
