import { describe, expect, it } from 'vitest';
import { resolveLoginEmail } from './login-identifier';

describe('登录账号 → 邮箱', () => {
  it('邮箱原样（去空格、转小写）', () => {
    expect(resolveLoginEmail('  Seller@Example.com ')).toBe('seller@example.com');
  });
  it('用户名补成本地域名邮箱', () => {
    expect(resolveLoginEmail('Admin')).toBe('admin@cn-portal.local');
  });
  it('空输入仍为空，交给必填校验', () => {
    expect(resolveLoginEmail('   ')).toBe('');
  });
});
