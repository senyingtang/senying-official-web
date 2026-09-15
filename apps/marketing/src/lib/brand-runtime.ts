import { resolveSameAsUrls, type MarketingSiteSettings } from '@syt/database/site-settings';
import { formatPageTitle, imageMimeType, type SeoBrand } from '@syt/seo';
import { BRAND } from '@syt/shared';
import { getMarketingSiteSettings } from './site-settings';

/**
 * 官網品牌的唯一 runtime 來源（Phase 2.7）。
 * Header、Footer、SEO title、og:site_name、OG alt、JSON-LD、favicon 都從這裡取得，不各自拼字串。
 *
 * 優先順序：全站設定（cms_site_settings: site.brand / site.socials）→ BRAND 常數 / public/brand 內建素材（fallback）
 */

/** 內建品牌素材（TEMPORARY BRAND ASSET：正式 Logo 交付前的字標 placeholder） */
export const BRAND_ASSET_FALLBACKS = {
  /** 深色背景用字標 */
  logo: '/brand/sen-ying-logo.svg',
  /** 淺色背景用字標 */
  logoOnLight: '/brand/sen-ying-logo-dark.svg',
  mark: '/brand/sen-ying-mark.svg',
  /** sen-ying-mark.svg 內的 <symbol id>，Header / Footer 以 <use> 引用同一個檔案 */
  markSymbolId: 'sen-ying-mark',
  favicon: '/brand/favicon.svg',
  favicon32: '/brand/favicon-32.png',
  favicon192: '/brand/favicon-192.png',
  appleTouchIcon: '/brand/apple-touch-icon.png',
  /** JSON-LD Organization logo 使用點陣圖（搜尋引擎相容性較好） */
  schemaLogo: '/brand/sen-ying-logo-512.png',
} as const;

/** Phase 2.6C 預設設定的 favicon 路徑（內容與 /brand/favicon.svg 相同，保留相容） */
const LEGACY_BUILT_IN_FAVICONS = new Set(['/favicon.svg', BRAND_ASSET_FALLBACKS.favicon]);

export interface BrandRuntime {
  nameZh: string;
  nameEn: string;
  /** 「森映 SEN YING」：title、og:site_name、JSON-LD name */
  displayName: string;
  footerName: string;
  description: string;
  /** 全站設定的 Logo，未設定時為內建字標 */
  logoUrl: string;
  hasCustomLogo: boolean;
  markUrl: string;
  markSymbolId: string;
  faviconUrl: string;
  faviconType: string;
  /** 使用內建 favicon 時才輸出 PNG / apple-touch-icon */
  hasCustomFavicon: boolean;
  /** 仍使用 TEMPORARY BRAND ASSET（沒有正式 Logo） */
  usesTemporaryLogo: boolean;
  sameAs: string[];
  /** JSON-LD 用 */
  seo: SeoBrand;
}

/** 只接受站內路徑或 https 網址（與後台 validateMarketingSiteSettings 規則一致）；其他值視為未設定 */
const safeAssetUrl = (value: string | undefined): string => {
  const url = value?.trim() ?? '';
  return /^(\/(?!\/)|https:\/\/)\S+$/.test(url) ? url : '';
};

export function resolveBrandSettings(settings: MarketingSiteSettings): BrandRuntime {
  const nameZh = settings.brand.brandNameZh.trim() || BRAND.nameZh;
  const nameEn = settings.brand.brandNameEn.trim() || BRAND.nameEn;
  const displayName = `${nameZh} ${nameEn}`.trim();
  const customLogo = safeAssetUrl(settings.brand.logoUrl);
  const customFavicon = safeAssetUrl(settings.brand.faviconUrl);
  const faviconUrl = customFavicon || BRAND_ASSET_FALLBACKS.favicon;
  const hasCustomLogo = customLogo !== '';
  const sameAs = resolveSameAsUrls(settings.socials);
  return {
    nameZh,
    nameEn,
    displayName,
    footerName: settings.brand.footerBrandName.trim() || displayName,
    description: BRAND.description,
    logoUrl: customLogo || BRAND_ASSET_FALLBACKS.logo,
    hasCustomLogo,
    markUrl: BRAND_ASSET_FALLBACKS.mark,
    markSymbolId: BRAND_ASSET_FALLBACKS.markSymbolId,
    faviconUrl,
    faviconType: imageMimeType(faviconUrl),
    hasCustomFavicon: !LEGACY_BUILT_IN_FAVICONS.has(faviconUrl),
    usesTemporaryLogo: !hasCustomLogo,
    sameAs,
    seo: {
      name: displayName,
      description: BRAND.description,
      logo: customLogo || BRAND_ASSET_FALLBACKS.schemaLogo,
      sameAs,
    },
  };
}

let pending: Promise<BrandRuntime> | undefined;

/** build 時解析一次（全站設定本身也只讀一次） */
export function getBrandRuntime(): Promise<BrandRuntime> {
  pending ??= getMarketingSiteSettings().then(resolveBrandSettings);
  return pending;
}

/** 頁面 title 統一格式（品牌來自全站設定） */
export function pageTitle(brand: BrandRuntime, title: string, template: 'page' | 'home' = 'page'): string {
  return formatPageTitle(title, { brandName: brand.displayName, template });
}
