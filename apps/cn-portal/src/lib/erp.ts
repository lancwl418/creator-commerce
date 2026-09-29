import { erpConfigFromEnv } from '@creator-commerce/shared/erp';

// 从环境变量装配 ERP 配置（与 apps/portal 共用同一套 ERP 凭据）
export const erpConfig = erpConfigFromEnv();
