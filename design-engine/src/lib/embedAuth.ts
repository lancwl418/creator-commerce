/**
 * Embed authentication for ERP iframe integration.
 *
 * Phase B (current): shared key passed via ?key= or x-embed-key header.
 * Phase C (future):  swap implementation to verify a short-lived JWT signed by ERP.
 *                    Callers do not need to change — only the body of these two
 *                    functions changes.
 */

const SHARED_KEY = process.env.EMBED_SHARED_KEY;

export interface EmbedAuthResult {
  ok: boolean;
  reason?: string;
}

/** Validate auth from a Request (used by API routes). */
export function validateEmbedAuthFromRequest(req: Request): EmbedAuthResult {
  if (!SHARED_KEY) return { ok: false, reason: 'EMBED_SHARED_KEY not configured' };
  const url = new URL(req.url);
  const key = req.headers.get('x-embed-key') ?? url.searchParams.get('key');
  if (!key) return { ok: false, reason: 'missing key' };
  if (key !== SHARED_KEY) return { ok: false, reason: 'invalid key' };
  return { ok: true };
}

/** Validate auth from URL search params (used in server components / page loaders). */
export function validateEmbedAuthFromParams(params: URLSearchParams | Record<string, string | undefined>): EmbedAuthResult {
  if (!SHARED_KEY) return { ok: false, reason: 'EMBED_SHARED_KEY not configured' };
  const key = params instanceof URLSearchParams ? params.get('key') : params.key;
  if (!key) return { ok: false, reason: 'missing key' };
  if (key !== SHARED_KEY) return { ok: false, reason: 'invalid key' };
  return { ok: true };
}
