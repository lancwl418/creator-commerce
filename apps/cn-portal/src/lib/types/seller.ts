import type { SellerTier } from '@creator-commerce/shared/erp/pricing';

/** 中国卖家账户：creators 表里 user_type = cn_seller 的记录 */
export interface Seller {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  /** 价格等级，决定卖家看到哪一档价格 */
  tier: SellerTier;
  /** ERP 客户档案 id；同步成功前为 null */
  erpCustomerId: string | null;
  erpSyncStatus: 'pending' | 'synced' | 'failed';
  /** Supabase Auth 用户 id */
  authUserId: string;
  /** 平台管理员（admin_users 里 status=active）：可改供应商显示名等设置 */
  isAdmin: boolean;
}

export interface SellerRow {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  seller_tier: string;
  erp_customer_id: string | null;
  erp_sync_status: string | null;
}

export interface SellerRegistration {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone: string;
}

/** 注册 / 登录表单提交后的状态 */
export interface AuthFormState {
  error?: string;
  notice?: string;
  /** 提交失败时回填表单的内容（不含密码）；表单提交后浏览器会清空输入 */
  values?: Record<string, string>;
}

export interface AuthPageProps {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}
