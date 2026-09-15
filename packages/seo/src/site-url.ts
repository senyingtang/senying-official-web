/**
 * 網站正式網址（canonical / og:url / sitemap 的唯一來源是 SITE_PUBLIC_URL）。
 * 本檔沒有任何 import：Astro、Next.js 與 Node 驗收腳本都可以直接載入。
 */

/** 開發 / 預覽 build 的 fallback；正式網址一律由 SITE_PUBLIC_URL 提供，不寫死網域 */
export const LOCAL_SITE_URL_FALLBACK = 'http://localhost:4321';

export interface SiteUrlState {
  /** 正規化後的網址（沒有結尾斜線） */
  url: string;
  /** true：SITE_PUBLIC_URL 未設定或無效，使用本機 fallback */
  isFallback: boolean;
}

export function isLocalSiteUrl(url: string): boolean {
  try {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

/**
 * 允許搜尋引擎索引（SITE_ALLOW_INDEXING=true，也就是正式上線 build）時，網址必須是 https 且不是 localhost。
 * 回傳問題說明；沒有問題時回傳 null。
 */
export function siteUrlIndexingProblem(state: SiteUrlState, allowIndexing: boolean): string | null {
  if (!allowIndexing) return null;
  if (state.isFallback) return 'SITE_ALLOW_INDEXING=true 但沒有設定有效的 SITE_PUBLIC_URL';
  if (isLocalSiteUrl(state.url)) return `SITE_ALLOW_INDEXING=true 但 SITE_PUBLIC_URL 是本機網址（${state.url}）`;
  if (!state.url.startsWith('https://')) return `SITE_ALLOW_INDEXING=true 時 SITE_PUBLIC_URL 必須是 https（${state.url}）`;
  return null;
}
