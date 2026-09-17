import { markdownToPlainText, SEARCHABLE_MARKETING_ROUTES } from '@syt/shared';
import { landingVariants } from '../content/landingVariants';
import { products } from '../content/products';
import { getMarketingCmsContent } from './cms';

/**
 * 全站搜尋索引（build 時產生，輸出到 /search-index.json）。
 *
 * 收錄：已發布文章、已發布案例、產品頁、主要行銷頁面。
 * 不收錄：草稿 / 排程 / 已下架內容（repository 本來就不會回傳）、後台 /admin、客戶後台 /portal、
 *         結帳頁 /checkout（noindex）、任何需要登入才能看到的內容。
 */
export type SearchEntryType = 'blog' | 'case' | 'product' | 'page';

export interface SearchEntry {
  type: SearchEntryType;
  title: string;
  excerpt: string;
  url: string;
  keywords: string[];
}

export const SEARCH_TYPE_LABELS: Record<SearchEntryType, string> = {
  blog: '文章',
  case: '案例',
  product: '產品',
  page: '頁面',
};

/** 索引不得包含的路徑前綴（驗收與執行時都以這份清單為準） */
export const SEARCH_EXCLUDED_PREFIXES = ['/admin', '/portal', '/cart', '/checkout', '/api'];

const clamp = (value: string, max = 160): string => (value.length <= max ? value : `${value.slice(0, max - 1)}…`);

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const { posts, postDetails, cases, caseDetails, categories } = await getMarketingCmsContent();

  const blogEntries: SearchEntry[] = posts.map((post) => {
    const detail = postDetails.find((item) => item.slug === post.slug);
    const categoryName = categories.find((item) => item.slug === post.categorySlug)?.name ?? '';
    return {
      type: 'blog',
      title: post.title,
      excerpt: clamp(post.excerpt || markdownToPlainText(detail?.content ?? '')),
      url: `/blog/${post.slug}`,
      keywords: [categoryName, post.authorName, '文章', '部落格'].filter(Boolean),
    };
  });

  const caseEntries: SearchEntry[] = cases.map((item) => {
    const detail = caseDetails.find((entry) => entry.slug === item.slug);
    return {
      type: 'case',
      title: item.title,
      excerpt: clamp(item.excerpt || markdownToPlainText(detail?.content ?? '')),
      url: `/cases/${item.slug}`,
      keywords: [item.industry, item.serviceType, item.isSample ? '版型示意' : '案例'].filter(Boolean),
    };
  });

  const productEntries: SearchEntry[] = [
    ...products.map<SearchEntry>((product) => ({
      type: 'product',
      title: product.name,
      excerpt: clamp(product.cardSummary || product.seoDescription),
      url: product.path,
      keywords: [...product.tags, product.category, '產品', '方案'],
    })),
    ...landingVariants.map<SearchEntry>((variant) => ({
      type: 'product',
      title: variant.name,
      excerpt: clamp(variant.cardSummary || variant.seoDescription),
      url: variant.path,
      keywords: ['一頁式網頁', '產品', ...variant.fits],
    })),
  ];

  const pageEntries: SearchEntry[] = SEARCHABLE_MARKETING_ROUTES.filter(
    (route) => !products.some((product) => product.path === route.route),
  ).map((route) => ({
    type: 'page',
    title: route.name,
    excerpt: clamp(route.purpose),
    url: route.route,
    keywords: route.keywords,
  }));

  return [...blogEntries, ...caseEntries, ...productEntries, ...pageEntries].filter(
    (entry) => entry.url.startsWith('/') && !SEARCH_EXCLUDED_PREFIXES.some((prefix) => entry.url === prefix || entry.url.startsWith(`${prefix}/`)),
  );
}
