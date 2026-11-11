'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isSellerTier } from '@creator-commerce/shared/erp/pricing';
import { createClient } from '@/lib/supabase/server';
import { getTranslator } from '@/lib/i18n/server';
import { parseCnSellerForm, REFILL_FIELDS } from './create-form';
import { syncCnSellerToErp } from './erp-sync';

const CN_PORTAL_SIGNUP_APP = 'cn_portal';
const CN_SELLERS_PATH = '/dashboard/cn-sellers';

export interface CreateCnSellerState {
  error?: string;
  /** 成功提示（含登录账号、ERP 同步结果） */
  notice?: string;
  /** 失败时回填（不含密码）；成功后为空，表单清空 */
  values?: Record<string, string>;
  /** 成功时的计数，客户端据此关闭弹窗 */
  createdAt?: number;
}

/** 当前登录用户是否为启用中的后台管理员（Admin 登录本身不区分卖家 / 管理员） */
async function isActiveAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle<{ id: string }>();
  return data != null;
}

/** 注册用的匿名 client：不落 cookie，避免把管理员当前会话切换成新卖家 */
function createSignupClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Admin 新建中国卖家：建登录账号（注册触发器同时建 cn_seller 的 creators 记录），
 * 按表单设等级和可见供应商，再在 ERP 建客户档案。ERP 失败不回滚账号，可在列表里重试。
 */
export async function createCnSellerAction(_state: CreateCnSellerState, form: FormData): Promise<CreateCnSellerState> {
  const { t } = await getTranslator();
  const values = Object.fromEntries(REFILL_FIELDS.map((name) => [name, String(form.get(name) ?? '')]));
  if (!(await isActiveAdmin())) return { error: t('cnSellers.create.error.forbidden'), values };

  const parsed = parseCnSellerForm(form);
  if (!parsed.ok) return { error: t(parsed.error), values };
  const { input } = parsed;

  const { data: signup, error: signupError } = await createSignupClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        signup_app: CN_PORTAL_SIGNUP_APP,
        company_name: input.companyName,
        contact_name: input.contactName,
        phone: input.phone,
      },
    },
  });
  if (signupError) {
    const taken = signupError.code === 'user_already_exists' || signupError.code === 'email_exists';
    return { error: taken ? t('cnSellers.create.error.taken') : signupError.message, values };
  }
  // 开启邮箱验证时，已注册的邮箱不报错，而是返回没有 identity 的用户
  if (!signup.user || signup.user.identities?.length === 0) return { error: t('cnSellers.create.error.taken'), values };

  const supabase = await createClient();
  const { data: seller, error: sellerError } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', signup.user.id)
    .eq('user_type', 'cn_seller')
    .maybeSingle<{ id: string }>();
  if (sellerError || !seller) {
    return { error: t('cnSellers.create.error.noSellerRow', { message: sellerError?.message ?? '' }), values };
  }

  const setupErrors: string[] = [];
  if (input.tier !== 'CN_MERCHANT') {
    const { error } = await supabase.from('creators').update({ seller_tier: input.tier }).eq('id', seller.id);
    if (error) setupErrors.push(error.message);
  }
  if (input.supplierIds.length > 0) {
    const { error } = await supabase.rpc('set_cn_seller_supplier_access', {
      p_creator_id: seller.id,
      p_supplier_ids: input.supplierIds,
    });
    if (error) setupErrors.push(error.message);
  }

  const erp = await syncCnSellerToErp(supabase, seller.id, input);
  revalidatePath(CN_SELLERS_PATH);

  const notices = [t('cnSellers.create.created', { email: input.email })];
  notices.push(erp.status === 'synced' ? t('cnSellers.create.erpSynced') : t('cnSellers.create.erpFailed', { error: erp.error }));
  if (!signup.session) notices.push(t('cnSellers.create.confirmEmail'));
  if (setupErrors.length > 0) notices.push(t('cnSellers.create.setupFailed', { error: setupErrors.join('; ') }));
  return { notice: notices.join(' '), createdAt: Date.now() };
}

/** 重新在 ERP 建客户档案（之前同步失败的卖家） */
export async function retryCnSellerErpSyncAction(sellerId: string): Promise<{ error?: string }> {
  const { t } = await getTranslator();
  if (!(await isActiveAdmin())) return { error: t('cnSellers.create.error.forbidden') };

  const supabase = await createClient();
  const { data: seller, error } = await supabase
    .from('creators')
    .select('id, email, company_name, contact_name, phone, seller_tier, erp_sync_status')
    .eq('id', sellerId)
    .eq('user_type', 'cn_seller')
    .maybeSingle<{
      id: string; email: string; company_name: string; contact_name: string; phone: string;
      seller_tier: string; erp_sync_status: string | null;
    }>();
  if (error || !seller) return { error: error?.message ?? t('cnSellers.create.error.notFound') };
  if (seller.erp_sync_status === 'synced') return {};

  if (!isSellerTier(seller.seller_tier)) return { error: `Unknown seller tier: ${seller.seller_tier}` };

  const result = await syncCnSellerToErp(supabase, seller.id, {
    email: seller.email,
    companyName: seller.company_name,
    contactName: seller.contact_name,
    phone: seller.phone,
    tier: seller.seller_tier,
  });
  revalidatePath(CN_SELLERS_PATH);
  return result.status === 'failed' ? { error: result.error } : {};
}
