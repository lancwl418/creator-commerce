# Ideamizer — POD 产品 2D 画布编辑器

## 项目概述

用于 Print on Demand 产品（T恤/杯子/手机壳）的 2D 画布编辑器。用户上传图案，在可印区域内调整位置/大小/旋转，输出可复现的 Design JSON。架构预留 Shopify/Etsy 插件集成。

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
├── app/              # Next.js App Router 页面和布局
├── components/
│   ├── editor/       # 编辑器专用组件 (EditorCanvas, Toolbar, LayerPanel...)
│   ├── ui/           # 通用可复用 UI 组件
│   └── layout/       # 布局组件
├── core/             # 框架无关的核心业务逻辑
│   ├── canvas/       # CanvasManager, ClipRegionManager, ObjectFactory, CanvasSerializer
│   ├── templates/    # ProductTemplateRegistry + 产品模板定义
│   └── design/       # ExportService
├── stores/           # Zustand stores (designStore, editorStore, productStore)
├── hooks/            # 自定义 React hooks (useCanvas, useHistory, useKeyboardShortcuts)
├── plugins/          # 插件系统 (PluginManager + shopify/ + etsy/ 预留)
├── lib/              # 工具函数 (cn, id)
└── types/            # TypeScript 类型定义 (design, product, editor, plugin)
```

## 架构原则

### 1. DesignDocument 是 source of truth
- Zustand `designStore` 持有 `DesignDocument`，Fabric.js canvas 是它的视图
- 所有设计操作先更新 store，再同步到 canvas
- JSON 序列化/反序列化必须完全可逆

### 2. CanvasManager 是纯 TypeScript 类
- 不依赖 React，React 组件只是薄壳委托给它
- 方便测试和未来在非 React 环境复用 (如服务端渲染缩略图)

### 3. 插件通过 PluginContext 访问系统
- 插件永远不直接 import stores 或 components
- 通过 `PluginContext` 接口交互，保证核心与插件解耦
- 编辑器永远不 import `plugins/shopify/` 或 `plugins/etsy/`

### 4. Fabric.js 必须客户端加载
- 使用 `next/dynamic` + `ssr: false` 包装 (见 `EditorShell.tsx`)
- Fabric.js 类型扩展在 `types/fabric-extensions.d.ts`

## 编码规范

### 命名
- **组件文件**: PascalCase (`EditorPage.tsx`, `LayerPanel.tsx`)
- **工具/类型/store**: camelCase (`designStore.ts`, `useCanvas.ts`)
- **模板文件**: `{product}.template.ts` (`tshirt.template.ts`)
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

## 核心类型

```typescript
// 设计文档 — 最终输出的 JSON
DesignDocument { version, id, name, productTemplateId, views: Record<string, DesignView> }
DesignView { viewId, layers: DesignLayer[] }
DesignLayer { id, type, name, visible, locked, opacity, transform: LayerTransform, data: LayerData }
LayerType = 'image' | 'text' | 'shape'

// 产品模板
ProductTemplate { id, type, name, views: ProductView[] }
ProductView { id, label, mockupImageUrl, printableArea: PrintableArea }
PrintableArea { shape, x, y, width, height, physicalWidthInches, physicalHeightInches, minDPI }
ProductType = 'tshirt' | 'mug' | 'phonecase'

// 插件
IdeamizerPlugin { id, name, platform, initialize(ctx), destroy(), hooks }
PluginHooks { beforeExport?, validateDesign?, mapProduct? }
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `core/canvas/CanvasManager.ts` | Fabric.js 生命周期、图层操作、导出 |
| `core/canvas/ClipRegionManager.ts` | 可印区域裁剪 (clipPath) |
| `core/canvas/ObjectFactory.ts` | DesignLayer → Fabric 对象工厂 |
| `core/canvas/CanvasSerializer.ts` | Canvas ↔ DesignJSON 双向转换 |
| `stores/designStore.ts` | 设计文档状态 (source of truth) + undo/redo |
| `components/editor/EditorShell.tsx` | dynamic import 包装 (ssr: false) |
| `components/editor/EditorPage.tsx` | 编辑器主页面 (组合所有面板) |
| `plugins/PluginManager.ts` | 插件注册与生命周期 |
| `core/design/ExportService.ts` | JSON/PNG 导出 + localStorage 持久化 |

## 自定义事件

画布组件间通过 `window` 自定义事件通信：
- `ideamizer:layer-added` — 新图层添加到画布
- `ideamizer:export-png` — 触发 PNG 导出（支持 `detail.callback` 回调模式）

## 外部集成 — iframe + postMessage 协议

编辑器通过 `/embed` 页面支持 iframe 嵌入。外部插件（Shopify/Etsy 等）在**独立项目**中开发，通过 postMessage 与编辑器通信。编辑器项目本身不包含任何平台插件代码。

### 关键文件
| 文件 | 职责 |
|------|------|
| `types/postmessage.ts` | 消息类型定义（对外契约） |
| `lib/postMessageBridge.ts` | 纯 TS 通信桥（origin 校验、消息路由） |
| `hooks/usePostMessageBridge.ts` | React Hook 包装桥的生命周期 |
| `app/embed/page.tsx` | 嵌入页面（自动检测 iframe → postMessage 模式，否则 URL 参数模式） |

### 通信流程
```
Host 页面                               Ideamizer iframe (/embed)
  │                                          │
  │── 加载 iframe ──────────────────────────>│
  │<── ideamizer:ready ─────────────────────│
  │                                          │
  │── ideamizer:init { template, metadata } ─>│  (编辑器加载产品模板)
  │                                          │
  │       ... 用户设计 ...                    │
  │<── ideamizer:design-changed ────────────│
  │                                          │
  │── ideamizer:request-export { format } ──>│
  │<── ideamizer:export-result { json, png } │
```

### 环境变量
- `NEXT_PUBLIC_ALLOWED_ORIGINS` — 允许 iframe 嵌入的域名（逗号分隔），用于 CSP `frame-ancestors` 和 postMessage origin 校验

## 常用命令

```bash
node node_modules/next/dist/bin/next dev    # 开发服务器 (Node 24 需直接调用)
node node_modules/next/dist/bin/next build  # 生产构建
npm run lint                                # ESLint 检查
```

> 注意: 由于 Node.js v24 与 Next.js 16 的兼容问题，`npm run dev` / `npm run build` 可能失败，需使用 `node node_modules/next/dist/bin/next` 直接调用。

## 添加新产品模板

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
