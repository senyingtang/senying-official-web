import { BRAND, normalizeBaseUrl } from '@syt/shared';
import { LOCAL_SITE_URL_FALLBACK, type SiteUrlState } from './site-url';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export type PageTitleTemplate = 'page' | 'home';

export interface PageSeoInput {
  /** 不含品牌名稱的標題；品牌由 formatPageTitle 統一加上 */
  title: string;
  description: string;
  /** 以 / 開頭的路徑 */
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  /** 以 / 開頭的站內路徑或完整 https 網址 */
  ogImage?: string;
  noindex?: boolean;
  /** page（預設）：「標題｜品牌」；home：「品牌｜標題」 */
  titleTemplate?: PageTitleTemplate;
}

export interface ResolvedPageSeo {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  og: {
    title: string;
    description: string;
    image: string;
    imageType: string;
    url: string;
    type: 'website' | 'article';
    siteName: string;
    locale: string;
  };
  warnings: string[];
}

export interface SeoImage {
  src: string;
  width: number;
  height: number;
  type: string;
}

/** 社群分享預設圖（1200×630 PNG，由 pnpm og:generate 產生） */
export const DEFAULT_OG_IMAGE: SeoImage = { src: '/images/og/default-og-1200x630.png', width: 1200, height: 630, type: 'image/png' };
export const DEFAULT_OG_IMAGE_PATH = DEFAULT_OG_IMAGE.src;

export const TITLE_SEPARATOR = '｜';

/**
 * 全站統一的 title 格式（不要在頁面各自拼品牌）：
 * - 一般頁：SEO 形象官網｜森映 SEN YING
 * - 首頁：森映 SEN YING｜網站設計、電商建置與 SEO 數位工具
 * 標題已含完整品牌名稱時不重複加。
 */
export function formatPageTitle(title: string, options: { brandName?: string; template?: PageTitleTemplate } = {}): string {
  const brandName = options.brandName?.trim() || BRAND.name;
  const text = title.trim();
  if (!text) return brandName;
  if (text.includes(brandName)) return text;
  return options.template === 'home' ? `${brandName}${TITLE_SEPARATOR}${text}` : `${text}${TITLE_SEPARATOR}${brandName}`;
}

export function resolveSiteUrlState(value: string | undefined | null): SiteUrlState {
  const normalized = normalizeBaseUrl(value);
  return { url: normalized ?? LOCAL_SITE_URL_FALLBACK, isFallback: !normalized };
}

export function resolveSiteUrl(value: string | undefined | null): string {
  return resolveSiteUrlState(value).url;
}

export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl}${path}`;
}

/** 依副檔名判斷圖片 MIME type（og:image:type、favicon link type） */
export function imageMimeType(pathOrUrl: string): string {
  const extension = pathOrUrl.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    gif: 'image/gif',
  };
  return (extension && types[extension]) || 'image/png';
}

/** 中文字元算 1、英數字算 0.5 的等效長度，對應規劃書 Title 30–60、Description 80–160 */
export function displayLength(text: string): number {
  let length = 0;
  for (const char of text) {
    // Latin-1 範圍（英數、半形符號）算 0.5，其餘（中文等）算 1
    length += (char.codePointAt(0) ?? 0) <= 0xff ? 0.5 : 1;
  }
  return Math.round(length);
}

export function resolvePageSeo(input: PageSeoInput, siteUrlValue: string | undefined | null, options: { brandName?: string } = {}): ResolvedPageSeo {
  const siteUrl = resolveSiteUrl(siteUrlValue);
  const brandName = options.brandName?.trim() || BRAND.name;
  const title = formatPageTitle(input.title, { brandName, template: input.titleTemplate });
  const canonicalPath = input.path === '/' ? '/' : input.path.replace(/\/+$/, '');
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE_PATH;
  const warnings: string[] = [];

  const titleLength = displayLength(title);
  if (titleLength < 15 || titleLength > 60) warnings.push(`title 等效長度 ${titleLength}，建議 15–60`);
  const descriptionLength = displayLength(input.description);
  if (descriptionLength < 40 || descriptionLength > 160) warnings.push(`description 等效長度 ${descriptionLength}，建議 40–160`);

  return {
    title,
    description: input.description,
    canonical: absoluteUrl(siteUrl, canonicalPath),
    robots: input.noindex ? 'noindex,nofollow' : 'index,follow',
    og: {
      title: input.ogTitle ?? title,
      description: input.ogDescription ?? input.description,
      image: absoluteUrl(siteUrl, ogImage),
      imageType: imageMimeType(ogImage),
      url: absoluteUrl(siteUrl, canonicalPath),
      type: 'website',
      siteName: brandName,
      locale: 'zh_TW',
    },
    warnings,
  };
}
