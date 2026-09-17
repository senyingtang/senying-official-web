import 'server-only';
import { normalizeBaseUrl } from '@syt/shared';

/**
 * 官網（storefront）origin 解析。
 *
 * 付款完成後要把使用者導回官網，但「導回哪裡」不能讓呼叫端自由指定（open redirect）。
 * 規則：
 *   1. 有設定 SITE_PUBLIC_URL → 只允許這個 origin
 *   2. 沒有設定（本機開發 / 驗收）→ 只允許 localhost / 127.0.0.1
 *   3. 都不符合 → 回傳設定值或本機預設值，忽略呼叫端傳來的內容
 */
const LOCAL_FALLBACK = 'http://127.0.0.1:4321';

function isLocalOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function resolveStorefrontOrigin(requested: string | null | undefined): string {
  const configured = normalizeBaseUrl(process.env.SITE_PUBLIC_URL);
  const candidate = normalizeBaseUrl(requested);
  if (configured) return candidate === configured ? candidate : configured;
  if (candidate && isLocalOrigin(candidate)) return candidate;
  return LOCAL_FALLBACK;
}
