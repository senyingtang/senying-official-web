import { resolveSiteUrlState, siteUrlIndexingProblem } from '@syt/seo';
import { normalizeBaseUrl } from '@syt/shared';

export { footerGroups, headerActions, legalLinks, mainNav, socialPlaceholders, type NavLink } from '../content/navigation';

/**
 * canonical / og:url / og:image / sitemap / robots 的唯一網址來源：SITE_PUBLIC_URL。
 * 未設定時為本機 / 預覽 build：使用 http://localhost:4321 fallback，BaseLayout 標示 syt-site-url=local-fallback，且全站 noindex。
 */
const siteUrlState = resolveSiteUrlState(import.meta.env.SITE_PUBLIC_URL);
export const siteUrl = siteUrlState.url;
export const siteUrlIsFallback = siteUrlState.isFallback;

/** LINE 官方帳號連結由環境變數提供；未設定時導向聯絡頁的 LINE 區塊 */
export const lineOaUrl = import.meta.env.PUBLIC_LINE_OA_URL?.trim() || '/contact#line';
export const lineIsExternal = /^https?:\/\//.test(lineOaUrl);

/**
 * 客戶後台登入入口：網址由 ADMIN_PUBLIC_URL 提供，不寫死網域。
 * 未設定時：開發環境指向本機後台；正式 build 導向結帳頁的權限代碼說明。
 */
const adminPublicUrl = normalizeBaseUrl(import.meta.env.ADMIN_PUBLIC_URL);
/**
 * 後台 API 來源（Phase 3.0）：sandbox 付款頁與金流 callback 都在 Next.js 後台。
 * 未設定時：開發 / 驗收使用本機後台；正式 build 沒有設定就代表不開放結帳。
 */
export const adminApiBase = adminPublicUrl ?? (import.meta.env.DEV ? 'http://localhost:3000' : null);
export const portalLoginUrl = adminPublicUrl
  ? `${adminPublicUrl}/portal/login`
  : import.meta.env.DEV
    ? 'http://localhost:3000/portal/login'
    : '/checkout#redeem';
export const portalIsExternal = /^https?:\/\//.test(portalLoginUrl);

export const allowIndexing = import.meta.env.SITE_ALLOW_INDEXING === 'true';

// 正式上線 build（允許索引）不可輸出 localhost / 缺少的 canonical：直接讓 build 失敗
const indexingProblem = siteUrlIndexingProblem(siteUrlState, allowIndexing);
if (indexingProblem) throw new Error(`[site] ${indexingProblem}。請設定正式 SITE_PUBLIC_URL（https）。`);
