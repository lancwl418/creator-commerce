import { describe, expect, it } from 'vitest';
import { oauthResultMessage } from './oauth-result';

describe('店铺授权回调提示', () => {
  it('成功、已知错误、未知错误各给对应文案', () => {
    expect(oauthResultMessage({ connected: 'shopify' })).toEqual({ notice: 'stores.notice.connected' });
    expect(oauthResultMessage({ error: 'invalid_state' })).toEqual({ error: 'stores.error.invalidState' });
    expect(oauthResultMessage({ error: ['token_exchange'] })).toEqual({ error: 'stores.error.tokenExchange' });
    expect(oauthResultMessage({ error: 'something_else' })).toEqual({ error: 'stores.error.generic' });
    expect(oauthResultMessage({})).toEqual({});
  });
});
