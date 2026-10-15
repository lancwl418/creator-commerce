import { describe, expect, it } from 'vitest';
import { authErrorMessage, parseRegistration, refillValues, safeReturnPath, signupMetadata } from './registration';
import { toSeller } from './seller';

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields = {
    companyName: ' 深圳某某贸易有限公司 ', contactName: '张三', phone: '+86 138-0000-0000',
    email: ' Seller@Example.com ', password: ' secret1 ', ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('注册表单校验', () => {
  it('去掉首尾空格、邮箱转小写，密码保持原样', () => {
    expect(parseRegistration(form())).toEqual({
      ok: true,
      registration: {
        companyName: '深圳某某贸易有限公司', contactName: '张三', phone: '+86 138-0000-0000',
        email: 'seller@example.com', password: ' secret1 ',
      },
    });
  });

  it('必填项、手机号、邮箱、密码长度不合格时给出对应提示', () => {
    expect(parseRegistration(form({ companyName: '  ' }))).toEqual({ ok: false, error: 'auth.error.required' });
    expect(parseRegistration(form({ contactName: '' }))).toEqual({ ok: false, error: 'auth.error.required' });
    expect(parseRegistration(form({ phone: 'abc' }))).toEqual({ ok: false, error: 'auth.error.phone' });
    expect(parseRegistration(form({ email: 'not-an-email' }))).toEqual({ ok: false, error: 'auth.error.email' });
    expect(parseRegistration(form({ password: '12345' }))).toEqual({ ok: false, error: 'auth.error.passwordLength' });
  });

  it('注册资料带上 cn_portal 来源，等级不由注册方提交', () => {
    const parsed = parseRegistration(form());
    if (!parsed.ok) throw new Error('expected valid registration');
    expect(signupMetadata(parsed.registration)).toEqual({
      signup_app: 'cn_portal',
      company_name: '深圳某某贸易有限公司',
      contact_name: '张三',
      phone: '+86 138-0000-0000',
    });
  });
});

describe('提交失败后回填表单', () => {
  it('回填除密码以外的内容', () => {
    expect(refillValues(form())).toEqual({
      companyName: '深圳某某贸易有限公司', contactName: '张三', phone: '+86 138-0000-0000', email: 'Seller@Example.com',
    });
  });
});

describe('登录后回跳路径', () => {
  it('只接受本站相对路径', () => {
    expect(safeReturnPath('/products/123?x=1')).toBe('/products/123?x=1');
    expect(safeReturnPath(['/products/1', '/other'])).toBe('/products/1');
    for (const next of [undefined, null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'products']) {
      expect(safeReturnPath(next)).toBe('/products');
    }
  });
});

describe('Supabase Auth 错误码', () => {
  it('认识的错误码给出对应文案，其余用兜底文案', () => {
    expect(authErrorMessage('invalid_credentials', 'auth.error.loginFailed')).toBe('auth.error.invalidCredentials');
    expect(authErrorMessage('user_already_exists', 'auth.error.registerFailed')).toBe('auth.error.emailTaken');
    expect(authErrorMessage('something_new', 'auth.error.loginFailed')).toBe('auth.error.loginFailed');
    expect(authErrorMessage(undefined, 'auth.error.registerFailed')).toBe('auth.error.registerFailed');
  });
});

describe('卖家账户', () => {
  const row = {
    id: 's1', email: 'seller@example.com', company_name: 'ACME', contact_name: '张三', phone: '13800000000',
    seller_tier: 'WHOLESALE', erp_customer_id: null, erp_sync_status: 'pending',
  };

  const auth = { authUserId: 'u1', isAdmin: false };

  it('价格等级取自账户；管理员身份来自 admin_users', () => {
    expect(toSeller(row, auth)).toEqual({
      id: 's1', email: 'seller@example.com', companyName: 'ACME', contactName: '张三', phone: '13800000000',
      tier: 'WHOLESALE', erpCustomerId: null, erpSyncStatus: 'pending', authUserId: 'u1', isAdmin: false,
    });
    expect(toSeller(row, { authUserId: 'u2', isAdmin: true }).isAdmin).toBe(true);
  });

  it('账户上是代码不认识的等级时报错，不默认成某个等级', () => {
    expect(() => toSeller({ ...row, seller_tier: 'GOLD' }, auth)).toThrow('Unknown seller tier: GOLD');
  });
});
