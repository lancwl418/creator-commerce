# 多产品编辑器 — 开发方案

## 背景

设计师上传一个设计后，需要将它应用到多个真实产品（来自 Shopify/ERP）上。编辑器需要支持多产品预览和编辑。

## 核心需求

1. **多产品选择** — 设计师可以一次选择多个产品（T-Shirt、Mug、Phone Case 等）
2. **多产品预览** — 左侧面板展示所有选中产品的缩略图预览
3. **统一编辑** — 调整设计位置/大小后可一键应用到所有产品
4. **独立编辑** — 点击某个产品切换到该产品的画布，单独调整
5. **产品增删** — 编辑过程中可以添加/移除产品

## 架构决策

### 不重构 DesignDocument

现有 `DesignDocument` 结构保持不变（单产品、多视图）。多产品通过外层容器管理：

```
MultiProductSession {
  designId: string,              // 共享的设计 ID
  activeProductIndex: number,    // 当前编辑的产品索引
  products: ProductEntry[],      // 每个产品独立的配置
}

ProductEntry {
  template: ProductTemplate,     // 产品模板数据
  design: DesignDocument,        // 该产品的独立设计文档
  thumbnail?: string,            // 缓存的缩略图（base64）
}
```

### 理由

- 复用现有编辑器核心逻辑，不碰 CanvasManager、ClipRegionManager
- 每个产品的 DesignDocument 可独立导出/保存
- 切换产品 = 保存当前状态 → 加载新产品的 DesignDocument（类似现有的视图切换）
- 降低风险，渐进式改造

## 编辑器布局

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar (现有工具栏不变)                                     │
├──────────────┬──────────────────────────────┬────────────────┤
│              │                              │                │
│  Product     │      Canvas                  │  Properties    │
│  Panel       │      (当前产品)               │  Panel         │
│              │                              │                │
│  ┌────────┐  │                              │  (现有属性      │
│  │ T-Shirt│◄ │  ┌────────────────────────┐  │   面板不变)     │
│  │ active │  │  │                        │  │                │
│  └────────┘  │  │   Fabric.js Canvas     │  │                │
│  ┌────────┐  │  │   (单产品编辑)          │  │                │
│  │  Mug   │  │  │                        │  │                │
│  │        │  │  └────────────────────────┘  │                │
│  └────────┘  │                              │                │
│  ┌────────┐  │  视图切换: [Front] [Back]    │                │
│  │ Phone  │  │                              │                │
│  │        │  │                              │                │
│  └────────┘  │                              │                │
│              │                              │                │
│  [+ Add]     │                              │                │
│  [Apply All] │                              │                │
│              │                              │                │
├──────────────┴──────────────────────────────┴────────────────┤
│  Layer Panel (当前产品的图层)                                  │
└─────────────────────────────────────────────────────────────┘
```

## 产品切换流程

```
用户点击左侧产品缩略图
  ↓
1. 保存当前产品状态
   - 从 Canvas 序列化当前 DesignDocument
   - 导出缩略图 (canvas.toDataURL) 更新预览
   - 保存到 multiProductStore.products[currentIndex].design
  ↓
2. 切换到新产品
   - multiProductStore.setActiveProduct(newIndex)
   - 从 products[newIndex] 取出 template + design
  ↓
3. 加载新产品到编辑器
   - productStore.selectTemplate(newTemplate)
   - designStore.loadDesign(newDesign)
   - CanvasManager 重新初始化（同视图切换逻辑）
  ↓
4. Canvas 显示新产品的 mockup + layers
```

## "Apply to All" 逻辑

```
用户点击 "Apply to All"
  ↓
1. 获取当前产品的设计配置
   - 提取所有 layers 的 transform (position, scale, rotation)
   - 提取 artwork asset 引用
  ↓
2. 对每个其他产品:
   a. 取出目标产品的 PrintableArea 尺寸
   b. 计算比例映射：
      - sourceArea = 当前产品的 printableArea
      - targetArea = 目标产品的 printableArea
      - scaleRatio = targetArea.width / sourceArea.width
   c. 应用映射后的 transform 到目标产品的 DesignDocument
   d. 更新缩略图预览
  ↓
3. UI 反馈：所有产品缩略图刷新
```

## 数据流

### 多产品 Store (新增)

```typescript
// stores/multiProductStore.ts

interface MultiProductState {
  // 会话状态
  isMultiProduct: boolean;
  designId: string | null;
  artworkUrl: string | null;

  // 产品列表
  products: ProductEntry[];
  activeIndex: number;

  // Actions
  addProduct: (template: ProductTemplate) => void;
  removeProduct: (index: number) => void;
  setActiveProduct: (index: number) => void;
  saveCurrentProduct: (design: DesignDocument, thumbnail?: string) => void;
  applyToAll: (sourceIndex: number) => void;
  getActiveProduct: () => ProductEntry | null;
}

interface ProductEntry {
  template: ProductTemplate;
  design: DesignDocument;
  thumbnail: string | null;      // base64 preview
  isDirty: boolean;              // 是否有未保存的修改
}
```

### 与现有 Store 的关系

```
multiProductStore (新增，管理多产品列表)
      │
      ├── productStore (现有，管理当前编辑的单个产品模板)
      │     ├── selectedTemplate
      │     └── activeViewId
      │
      └── designStore (现有，管理当前编辑的 DesignDocument)
            ├── design.views
            └── design.layers
```

multiProductStore 是上层协调者，在产品切换时：
- 先从 designStore 保存当前状态
- 再通过 productStore + designStore 加载新产品

## 实施步骤

### Phase 1: 多产品 Store + 产品面板 UI

1. 创建 `multiProductStore.ts`
2. 创建 `MultiProductPanel.tsx` 组件（左侧产品列表）
3. 修改 `EditorPage.tsx` 布局，集成产品面板
4. 实现产品切换逻辑（保存 → 加载）

### Phase 2: Apply to All

1. 实现 transform 映射算法（不同 printableArea 之间的比例换算）
2. 缩略图批量更新
3. UI 反馈

### Phase 3: Portal 集成

1. Portal Product Builder 改为多选产品
2. 从 Design Engine API 获取真实产品列表
3. 创建多个 sellable_product_instances
4. 编辑器 iframe 传入多产品参数

### Phase 4: 预览增强

1. 产品缩略图实时预览（当前编辑的产品实时更新缩略图）
2. 全部产品的 grid 预览模式
3. 导出所有产品的预览图

## Portal 侧改动

### Product Builder 流程变更

```
当前: 选 Design → 选 1 个模板 → 创建 1 个 sellable_product_instance
改后: 选 Design → 选多个产品 → 创建多个 sellable_product_instances → 进入多产品编辑器
```

### 数据库

不需要新表。多个 `sellable_product_instances` 通过 `design_id` 关联到同一个设计。
查询某个设计的所有产品：`WHERE design_id = ? AND creator_id = ?`

### iframe 通信

```typescript
// Portal → Design Engine (embed URL params)
/embed?mode=multi
  &design_id=xxx
  &artwork_url=https://...
  &templates=tshirt-front,mug-wrap,phonecase-back  // 逗号分隔的模板 ID

// 或通过 postMessage 传入完整产品数据
{
  type: 'INIT_MULTI_PRODUCT',
  payload: {
    designId: string,
    artworkUrl: string,
    products: ProductTemplate[],
  }
}
```

## 注意事项

1. **性能** — 切换产品时 CanvasManager 需要 dispose + reinit，要确保内存不泄漏
2. **Undo/Redo** — 每个产品独立的 undo 历史，切换产品时暂停 undo 追踪
3. **自动保存** — 切换产品前必须保存当前状态，防止丢失
4. **缩略图** — 用低分辨率 canvas.toDataURL 生成，避免性能问题
5. **产品数量上限** — 建议最多 10 个产品同时编辑，避免内存占用过大
