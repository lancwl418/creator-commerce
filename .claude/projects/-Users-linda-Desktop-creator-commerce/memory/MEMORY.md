- [feedback_supabase_pitfalls.md](feedback_supabase_pitfalls.md) — Supabase 触发器 search_path 等常见坑
- [roadmap_summary.md](roadmap_summary.md) — 产品路线图摘要：MVP人工驱动、选品决策记录表、三阶段规划、Go/No-Go指标
- [data_model_gap_analysis.md](data_model_gap_analysis.md) — 当前Schema vs 路线图需求的差距分析，缺失表和字段清单
- [feedback_product_flow.md](feedback_product_flow.md) — 产品创建流程优化：选产品后直接进编辑器，save 后才写数据库

## 关键认知
- **MVP 是运营驱动，不是 Creator 自助。** 运营团队做选品决策，Creator 只负责上传图案。
- **选品决策记录表是最重要的数据资产。** 前50条人工填写，是未来AI Agent的训练数据地基。
- **当前 Schema 缺少整个 Admin 运营层：** 选品决策表、文件质检表、上架追踪表、Admin用户表 全部缺失。
- **Design Engine 多产品切换 bug**: 需要 `_reinitToken` 强制 canvas 重新初始化（已修复 e110ce6）。
