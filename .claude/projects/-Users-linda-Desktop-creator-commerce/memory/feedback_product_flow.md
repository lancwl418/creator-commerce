---
name: 产品创建流程优化方向
description: 用户对 Create Product 流程的反馈 — 选产品后应直接进编辑器，不提前创建数据库记录
type: feedback
---

当前流程：选 Design → 选产品 → Create Product（写入数据库）→ 跳转 Design Engine
问题：Create Product 后 Products 页面立刻出现未完成的产品 listing，用户觉得 confusing。

**Why:** 产品还没设计好就出现在列表里不合理，应该在编辑器里设计完 save 之后才创建记录。

**How to apply:** 后续重构时考虑：
- 选产品后直接跳 Design Engine，不提前写数据库
- 在 Design Engine 里 save/完成设计后，才回调 Portal 创建 sellable_product_instances
- Products 页面只展示已完成设计的产品
- 这个改动待后续讨论确认后再实施
