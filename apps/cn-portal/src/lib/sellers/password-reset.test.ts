import { describe, expect, it } from 'vitest';
import { emailRedirectUrl, parseNewPassword } from './password-reset';

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('找回密码', () => {
  it('邮件链接回到本站确认路由，并带上目标页', () => {
    expect(emailRedirectUrl('https://cn.example.com', '/reset-password'))
      .toBe('https://cn.example.com/auth/confirm?next=%2Freset-password');
  });

  it('新密码需要满足最小长度且两次一致', () => {
    expect(parseNewPassword(form({ password: 'secret1', passwordConfirm: 'secret1' }))).toEqual({ ok: true, password: 'secret1' });
    expect(parseNewPassword(form({ password: 'abc', passwordConfirm: 'abc' }))).toEqual({ ok: false, error: 'auth.error.passwordLength' });
    expect(parseNewPassword(form({ password: 'secret1', passwordConfirm: 'secret2' }))).toEqual({ ok: false, error: 'auth.error.passwordMismatch' });
    expect(parseNewPassword(form({ password: ' secret1', passwordConfirm: ' secret1' }))).toEqual({ ok: true, password: ' secret1' });
  });
});
