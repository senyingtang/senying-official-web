import type { BlogCategoryOption, BlogPostDetail, BlogPostSummary, CaseStudyDetail, CaseStudySummary } from '@syt/database/cms-content';
import { resolveDataSourceConfig } from '@syt/database/data-source';

/**
 * 官網內容（build 時取得，同一次 build 只讀一次）。
 *
 * - DATA_SOURCE=mock（預設）：packages/database 的 mock CMS 內容
 * - DATA_SOURCE=supabase：以 anon key 讀取已發布內容（RLS：posts_public_read / cases_public_read），不使用 service role
 *
 * 草稿、未到期的排程與已下架內容不會出現在這裡，因此也不會進入 static build 或搜尋索引。
 * 設定錯誤時直接讓 build 失敗，不默默改用其他資料；但「沒有內容」是正常狀態，頁面會顯示 Empty State。
 */

export interface MarketingCmsContent {
  posts: BlogPostSummary[];
  postDetails: BlogPostDetail[];
  categories: BlogCategoryOption[];
  cases: CaseStudySummary[];
  caseDetails: CaseStudyDetail[];
}

let pending: Promise<MarketingCmsContent> | undefined;

export function getMarketingCmsContent(): Promise<MarketingCmsContent> {
  pending ??= loadContent();
  return pending;
}

async function loadContent(): Promise<MarketingCmsContent> {
  const config = resolveDataSourceConfig({
    DATA_SOURCE: import.meta.env.DATA_SOURCE,
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  });

  if (config.kind === 'mock') {
    const { createMockRepositories } = await import('@syt/database');
    const repos = createMockRepositories();
    return collect(repos.cmsBlog, repos.cmsCases);
  }

  const { createPublicCmsReaders } = await import('@syt/database/public-cms');
  const readers = createPublicCmsReaders(config);
  return collect(readers.blog, readers.cases);
}

type BlogReader = {
  listPublished: () => Promise<BlogPostSummary[]>;
  getPublishedBySlug: (slug: string) => Promise<BlogPostDetail | null>;
  listCategories: () => Promise<BlogCategoryOption[]>;
};
type CaseReader = {
  listPublished: () => Promise<CaseStudySummary[]>;
  getPublishedBySlug: (slug: string) => Promise<CaseStudyDetail | null>;
};

async function collect(blog: BlogReader, cases: CaseReader): Promise<MarketingCmsContent> {
  const [posts, categories, caseList] = await Promise.all([blog.listPublished(), blog.listCategories(), cases.listPublished()]);
  const [postDetails, caseDetails] = await Promise.all([
    Promise.all(posts.map((post) => blog.getPublishedBySlug(post.slug))),
    Promise.all(caseList.map((item) => cases.getPublishedBySlug(item.slug))),
  ]);
  return {
    posts,
    categories,
    cases: caseList,
    postDetails: postDetails.filter((item): item is BlogPostDetail => item !== null),
    caseDetails: caseDetails.filter((item): item is CaseStudyDetail => item !== null),
  };
}

/** 分類 slug → 顯示名稱（沒有對應分類時回傳空字串） */
export function categoryLabel(categories: BlogCategoryOption[], slug: string): string {
  return categories.find((item) => item.slug === slug)?.name ?? '';
}

/** 服務類型 → 對應的產品頁；沒有對應時不輸出連結 */
export const SERVICE_TYPE_LINKS: Record<string, string> = {
  'SEO 形象官網': '/products/seo-website',
  一頁式網頁: '/products/landing-page',
  電商網站: '/products/ecommerce-website',
  'SEO 文章生產器': '/products/seo-article-generator',
  '活動 DM / 宣傳頁': '/products/promo-page-design',
};

/** 服務類型 → 案例卡的版面示意類型（沒有封面圖時使用） */
export const SERVICE_TYPE_VISUALS: Record<string, 'website' | 'ecommerce' | 'landing' | 'article'> = {
  'SEO 形象官網': 'website',
  電商網站: 'ecommerce',
  一頁式網頁: 'landing',
  'SEO 文章生產器': 'article',
  '活動 DM / 宣傳頁': 'landing',
};

/** 相關文章：同分類優先，不足時補上其他最新文章 */
export function relatedPosts(posts: BlogPostSummary[], current: BlogPostSummary, limit = 3): BlogPostSummary[] {
  const others = posts.filter((post) => post.slug !== current.slug);
  const sameCategory = others.filter((post) => post.categorySlug && post.categorySlug === current.categorySlug);
  return [...sameCategory, ...others.filter((post) => !sameCategory.includes(post))].slice(0, limit);
}

/** 相關案例：同產業優先，不足時補上其他案例 */
export function relatedCases(cases: CaseStudySummary[], current: CaseStudySummary, limit = 3): CaseStudySummary[] {
  const others = cases.filter((item) => item.slug !== current.slug);
  const sameIndustry = others.filter((item) => item.industry && item.industry === current.industry);
  return [...sameIndustry, ...others.filter((item) => !sameIndustry.includes(item))].slice(0, limit);
}

export function formatPublishedDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** <time datetime="…"> 使用的 ISO 日期（YYYY-MM-DD） */
export function isoDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
