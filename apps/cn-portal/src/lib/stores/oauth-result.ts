import type { MessageKey } from '../i18n';

/** 授权回调落地页的提示：对应 /api/shopify/callback 跳转时带的 query */
const OAUTH_ERROR_MESSAGES: Record<string, MessageKey> = {
  missing_params: 'stores.error.missingParams',
  invalid_state: 'stores.error.invalidState',
  session_expired: 'stores.error.sessionExpired',
  invalid_hmac: 'stores.error.invalidHmac',
  token_exchange: 'stores.error.tokenExchange',
  save_failed: 'stores.error.saveFailed',
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function oauthResultMessage(params: {
  connected?: string | string[];
  error?: string | string[];
}): { notice?: MessageKey; error?: MessageKey } {
  if (single(params.connected) === 'shopify') return { notice: 'stores.notice.connected' };
  const error = single(params.error);
  if (error) return { error: OAUTH_ERROR_MESSAGES[error] ?? 'stores.error.generic' };
  return {};
}
