import { BRAND } from '@syt/shared';
import { absoluteUrl, type BreadcrumbItem } from './metadata';

export type JsonLd = Record<string, unknown>;

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * JSON-LD 使用的品牌資料。官網由全站設定（Site Settings）解析後傳入；
 * 未傳入時使用 BRAND 常數（fallback）。
 */
export interface SeoBrand {
  name: string;
  description?: string;
  /** 站內路徑或 https 網址 */
  logo?: string;
  /** 只放已啟用、http / https 的社群網址 */
  sameAs?: readonly string[];
}

export const DEFAULT_SEO_BRAND: SeoBrand = { name: BRAND.name, description: BRAND.description };

const organizationId = (siteUrl: string) => `${siteUrl}/#organization`;
const webSiteId = (siteUrl: string) => `${siteUrl}/#website`;

/** 安全輸出到 <script type="application/ld+json">，避免 </script> 注入 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function organizationJsonLd(siteUrl: string, brand: SeoBrand = DEFAULT_SEO_BRAND): JsonLd {
  const sameAs = [...new Set((brand.sameAs ?? []).map((url) => url.trim()).filter((url) => /^https?:\/\/\S+$/i.test(url)))];
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: brand.name,
    url: siteUrl,
    ...(brand.description ? { description: brand.description } : {}),
    ...(brand.logo ? { logo: absoluteUrl(siteUrl, brand.logo) } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    // contactPoint：正式聯絡資訊確認後由 CMS 補上
  };
}

export function webSiteJsonLd(siteUrl: string, brand: SeoBrand = DEFAULT_SEO_BRAND): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': webSiteId(siteUrl),
    name: brand.name,
    url: siteUrl,
    inLanguage: 'zh-TW',
    publisher: { '@id': organizationId(siteUrl) },
  };
}

export function breadcrumbJsonLd(siteUrl: string, items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(siteUrl, item.href),
    })),
  };
}

export function faqPageJsonLd(items: FaqItem[]): JsonLd | null {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function serviceJsonLd(
  siteUrl: string,
  input: { name: string; description: string; path: string; serviceType?: string },
  brand: SeoBrand = DEFAULT_SEO_BRAND,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    serviceType: input.serviceType ?? input.name,
    url: absoluteUrl(siteUrl, input.path),
    provider: { '@type': 'Organization', '@id': organizationId(siteUrl), name: brand.name, url: siteUrl },
    areaServed: { '@type': 'Country', name: 'Taiwan' },
    // offers：方案價格確認後由 commerce_product_prices 產生
  };
}

export function softwareApplicationJsonLd(siteUrl: string, input: { name: string; description: string; path: string }, brand: SeoBrand = DEFAULT_SEO_BRAND): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: absoluteUrl(siteUrl, input.path),
    publisher: { '@type': 'Organization', '@id': organizationId(siteUrl), name: brand.name, url: siteUrl },
  };
}

export function articleJsonLd(
  siteUrl: string,
  input: { title: string; description: string; path: string; publishedAt?: string; image?: string },
  brand: SeoBrand = DEFAULT_SEO_BRAND,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(siteUrl, input.path),
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    ...(input.image ? { image: absoluteUrl(siteUrl, input.image) } : {}),
    publisher: {
      '@type': 'Organization',
      '@id': organizationId(siteUrl),
      name: brand.name,
      ...(brand.logo ? { logo: { '@type': 'ImageObject', url: absoluteUrl(siteUrl, brand.logo) } } : {}),
    },
  };
}

export function itemListJsonLd(siteUrl: string, input: { name: string; items: { name: string; path: string }[] }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(siteUrl, item.path),
    })),
  };
}

export function webPageJsonLd(
  siteUrl: string,
  input: { type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'CheckoutPage'; name: string; description: string; path: string },
  brand: SeoBrand = DEFAULT_SEO_BRAND,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'WebPage',
    name: input.name,
    description: input.description,
    url: absoluteUrl(siteUrl, input.path),
    inLanguage: 'zh-TW',
    isPartOf: { '@type': 'WebSite', '@id': webSiteId(siteUrl), name: brand.name, url: siteUrl },
  };
}
