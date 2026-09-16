/**
 * 官網 CMS 內容模型（Phase 2.9）：Blog 文章與案例。
 *
 * 資料表沿用 DB SQL v2.0 既有的 blog_posts / blog_categories / case_studies / seo_metadata，
 * 0017 只補上缺少的欄位（author_name、cover_image_url、industry、service_type、content、gallery、og_image_url）。
 * per-entity SEO 一律存在 seo_metadata（entity_type = 'blog_post' / 'case_study'），不另外建立第二套 SEO 欄位。
 */
import { findUnsafeContentPatterns, isSafeContentUrl, markdownToPlainText } from '@syt/shared';

/** 後台使用的內容狀態（DB enum 另有 review，讀取時併入 draft） */
export const CONTENT_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: '草稿',
  scheduled: '排程中',
  published: '已發布',
  archived: '已下架',
};

export const SEO_ENTITY_TYPES = { blogPost: 'blog_post', caseStudy: 'case_study', page: 'page' } as const;

export interface ContentSeo {
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalOverride: string;
}

export const EMPTY_CONTENT_SEO: ContentSeo = { seoTitle: '', seoDescription: '', ogImageUrl: '', canonicalOverride: '' };

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: ContentStatus;
  categorySlug: string;
  categoryName: string;
  coverImageUrl: string;
  authorName: string;
  isFeatured: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string;
  readingMinutes: number;
  seo: ContentSeo;
}

export interface BlogCategoryOption {
  id: string;
  slug: string;
  name: string;
}

export interface CaseStudySummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  industry: string;
  serviceType: string;
  coverImageUrl: string;
  /** 客戶或專案標示（例如 Hungjui、森映內部工具、版型示意） */
  clientLabel: string;
  /** true：版型 / 設計示意，不是客戶專案；前台必須明確標示 */
  isSample: boolean;
  /** 案例目前狀態文字（案例整理中 / 內部使用中 / 版型示意…），不是成效數據 */
  displayStatus: string;
  status: ContentStatus;
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudyDetail extends CaseStudySummary {
  content: string;
  challenge: string;
  solution: string;
  resultSummary: string;
  gallery: GalleryImage[];
  seo: ContentSeo;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
  categorySlug: string;
  coverImageUrl: string;
  authorName: string;
  isFeatured: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  seo: ContentSeo;
}

export interface CaseStudyInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  industry: string;
  serviceType: string;
  coverImageUrl: string;
  clientLabel: string;
  isSample: boolean;
  displayStatus: string;
  gallery: GalleryImage[];
  status: ContentStatus;
  isFeatured: boolean;
  sortOrder: number;
  challenge: string;
  solution: string;
  /** 沒有正式數據時留白；不預填任何未經確認的成效數字 */
  resultSummary: string;
  publishedAt: string | null;
  seo: ContentSeo;
}

/** 案例產業 / 服務類型的常用選項（欄位仍可自由輸入） */
export const CASE_INDUSTRY_OPTIONS = ['品牌形象', '電商零售', '餐飲', '美容美業', '教育培訓', '活動行銷', '專業服務', '製造業', '其他'] as const;
export const CASE_SERVICE_TYPE_OPTIONS = ['SEO 形象官網', '一頁式網頁', '電商網站', '活動 DM / 宣傳頁', 'SEO 文章生產器', '客製開發'] as const;

// ---------------------------------------------------------------------------
// slug / 狀態
// ---------------------------------------------------------------------------

/** DB check 條件：^[a-z0-9]+(?:-[a-z0-9]+)*$ */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** DB enum 值 → 後台狀態（review 併入 draft） */
export function toContentStatus(value: unknown): ContentStatus {
  if (value === 'review') return 'draft';
  return typeof value === 'string' && (CONTENT_STATUSES as readonly string[]).includes(value) ? (value as ContentStatus) : 'draft';
}

/**
 * 前台是否可見（與 DB public.is_publicly_visible 相同規則）：
 * status = published 且 published_at <= now 且（scheduled_at 為空或已到）。
 */
export function isPubliclyVisible(status: ContentStatus, publishedAt: string | null, scheduledAt: string | null = null, now: Date = new Date()): boolean {
  if (status !== 'published' || !publishedAt) return false;
  if (Date.parse(publishedAt) > now.getTime()) return false;
  if (scheduledAt && Date.parse(scheduledAt) > now.getTime()) return false;
  return true;
}

// ---------------------------------------------------------------------------
// 驗證（後台 server action 使用；欄位名稱對應表單 name）
// ---------------------------------------------------------------------------

export interface ContentValidation {
  ok: boolean;
  errors: Record<string, string>;
}

const LIMITS = { title: 150, excerpt: 300, content: 60000, seoTitle: 120, seoDescription: 320, text: 200 } as const;

/** 圖片 / canonical 欄位：必須是站內路徑或 https 網址 */
function checkAssetUrl(errors: Record<string, string>, field: string, value: string): void {
  if (!value) return;
  if (!/^(\/(?!\/)|https:\/\/)/.test(value) || !isSafeContentUrl(value)) errors[field] = '請使用站內路徑（/ 開頭）或 https 網址';
}

function checkUnsafe(errors: Record<string, string>, field: string, value: string): void {
  const hits = findUnsafeContentPatterns(value);
  if (hits.length > 0) errors[field] = `內容不可包含 ${hits.join('、')}`;
}

function validateSeo(errors: Record<string, string>, seo: ContentSeo): void {
  if (seo.seoTitle.length > LIMITS.seoTitle) errors.seo_title = `SEO 標題請控制在 ${LIMITS.seoTitle} 字以內`;
  if (seo.seoDescription.length > LIMITS.seoDescription) errors.seo_description = `SEO 描述請控制在 ${LIMITS.seoDescription} 字以內`;
  checkUnsafe(errors, 'seo_title', seo.seoTitle);
  checkUnsafe(errors, 'seo_description', seo.seoDescription);
  checkAssetUrl(errors, 'og_image_url', seo.ogImageUrl);
  checkAssetUrl(errors, 'canonical_override', seo.canonicalOverride);
}

interface CommonInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
  publishedAt: string | null;
}

function validateCommon(errors: Record<string, string>, input: CommonInput): void {
  if (!input.slug.trim()) errors.slug = '請填寫網址代稱（slug）';
  else if (!isValidSlug(input.slug)) errors.slug = '只能使用小寫英數字與連字號，例如 new-site-seo-guide';
  else if (input.slug.length > 120) errors.slug = 'slug 請控制在 120 字以內';

  if (!input.title.trim()) errors.title = '請填寫標題';
  else if (input.title.length > LIMITS.title) errors.title = `標題請控制在 ${LIMITS.title} 字以內`;

  if (input.excerpt.length > LIMITS.excerpt) errors.excerpt = `摘要請控制在 ${LIMITS.excerpt} 字以內`;
  if (input.content.length > LIMITS.content) errors.content = `內容長度超過上限（${LIMITS.content} 字）`;

  checkUnsafe(errors, 'title', input.title);
  checkUnsafe(errors, 'excerpt', input.excerpt);
  checkUnsafe(errors, 'content', input.content);

  if (!(CONTENT_STATUSES as readonly string[]).includes(input.status)) errors.status = '狀態不正確';
  if (input.status === 'published' && !input.publishedAt) errors.published_at = '發布狀態必須有發布時間';
  if (input.publishedAt && Number.isNaN(Date.parse(input.publishedAt))) errors.published_at = '發布時間格式不正確';
}

export function validateBlogPostInput(input: BlogPostInput): ContentValidation {
  const errors: Record<string, string> = {};
  validateCommon(errors, input);
  if (input.authorName.length > LIMITS.text) errors.author_name = `作者名稱請控制在 ${LIMITS.text} 字以內`;
  checkUnsafe(errors, 'author_name', input.authorName);
  checkAssetUrl(errors, 'cover_image_url', input.coverImageUrl);
  if (input.categorySlug && !isValidSlug(input.categorySlug)) errors.category_slug = '分類代稱不正確';
  if (input.status === 'scheduled' && !input.scheduledAt) errors.scheduled_at = '排程狀態必須填寫排程時間';
  if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt))) errors.scheduled_at = '排程時間格式不正確';
  validateSeo(errors, input.seo);
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCaseStudyInput(input: CaseStudyInput): ContentValidation {
  const errors: Record<string, string> = {};
  validateCommon(errors, input);
  for (const [field, value] of [
    ['industry', input.industry],
    ['service_type', input.serviceType],
    ['client_label', input.clientLabel],
    ['display_status', input.displayStatus],
  ] as const) {
    if (value.length > LIMITS.text) errors[field] = `請控制在 ${LIMITS.text} 字以內`;
    checkUnsafe(errors, field, value);
  }
  for (const [field, value] of [
    ['challenge', input.challenge],
    ['solution', input.solution],
    ['result_summary', input.resultSummary],
  ] as const) {
    checkUnsafe(errors, field, value);
    if (value.length > LIMITS.content) errors[field] = '內容長度超過上限';
  }
  checkAssetUrl(errors, 'cover_image_url', input.coverImageUrl);
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 9999) errors.sort_order = '排序請填 0–9999 的整數';
  input.gallery.forEach((image, index) => {
    checkAssetUrl(errors, `gallery.${index}.url`, image.url);
    checkUnsafe(errors, `gallery.${index}.alt`, image.alt);
  });
  validateSeo(errors, input.seo);
  return { ok: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// 資料表對應
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const nullableText = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const flag = (value: unknown): boolean => value === true;
const embedded = (value: unknown): Row | null => {
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value && typeof value === 'object' ? (value as Row) : null;
};

export function parseGallery(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item && typeof item === 'object' ? (item as Row) : {}))
    .map((item) => ({ url: text(item.url), alt: text(item.alt) }))
    .filter((item) => item.url !== '' && isSafeContentUrl(item.url));
}

export function seoFromRow(row: Row | null | undefined): ContentSeo {
  if (!row) return { ...EMPTY_CONTENT_SEO };
  return {
    seoTitle: text(row.seo_title),
    seoDescription: text(row.meta_description),
    ogImageUrl: text(row.og_image_url),
    canonicalOverride: text(row.canonical_url),
  };
}

export function seoToRow(entityType: string, entityId: string, seo: ContentSeo): Record<string, unknown> {
  return {
    entity_type: entityType,
    entity_id: entityId,
    seo_title: nullableText(seo.seoTitle.trim()),
    meta_description: nullableText(seo.seoDescription.trim()),
    og_image_url: nullableText(seo.ogImageUrl.trim()),
    canonical_url: nullableText(seo.canonicalOverride.trim()),
  };
}

export function blogPostFromRow(row: Row, seo?: Row | null): BlogPostDetail {
  const category = embedded(row.category);
  const content = text(row.content);
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    excerpt: text(row.excerpt),
    content,
    readingMinutes: Math.max(1, Math.round(markdownToPlainText(content).replace(/\s/g, '').length / 400)),
    status: toContentStatus(row.status),
    categorySlug: text(category?.slug),
    categoryName: text(category?.name, '未分類'),
    coverImageUrl: text(row.cover_image_url),
    authorName: text(row.author_name),
    isFeatured: flag(row.is_featured),
    publishedAt: nullableText(row.published_at),
    scheduledAt: nullableText(row.scheduled_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    seo: seoFromRow(seo),
  };
}

export function caseStudyFromRow(row: Row, seo?: Row | null): CaseStudyDetail {
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    excerpt: text(row.summary),
    content: text(row.content),
    industry: text(row.industry),
    serviceType: text(row.service_type),
    coverImageUrl: text(row.cover_image_url),
    clientLabel: text(row.client_name),
    isSample: flag(row.is_sample),
    displayStatus: text(row.display_status),
    status: toContentStatus(row.status),
    isFeatured: flag(row.is_featured),
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    challenge: text(row.challenge),
    solution: text(row.solution),
    resultSummary: text(row.result),
    gallery: parseGallery(row.gallery),
    publishedAt: nullableText(row.published_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    seo: seoFromRow(seo),
  };
}

/** 後台輸入 → blog_posts 資料列（category_id / author_id 由 repository 解析後補上） */
export function blogPostToRow(input: BlogPostInput): Record<string, unknown> {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: nullableText(input.excerpt.trim()),
    content: input.content,
    status: input.status,
    cover_image_url: nullableText(input.coverImageUrl.trim()),
    author_name: nullableText(input.authorName.trim()),
    is_featured: input.isFeatured,
    published_at: input.publishedAt,
    scheduled_at: input.scheduledAt,
  };
}

export function caseStudyToRow(input: CaseStudyInput): Record<string, unknown> {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    summary: nullableText(input.excerpt.trim()),
    content: input.content,
    industry: nullableText(input.industry.trim()),
    service_type: nullableText(input.serviceType.trim()),
    cover_image_url: nullableText(input.coverImageUrl.trim()),
    client_name: nullableText(input.clientLabel.trim()),
    is_sample: input.isSample,
    display_status: nullableText(input.displayStatus.trim()),
    gallery: input.gallery.filter((image) => image.url.trim() !== '').map((image) => ({ url: image.url.trim(), alt: image.alt.trim() })),
    status: input.status,
    is_featured: input.isFeatured,
    sort_order: input.sortOrder,
    challenge: nullableText(input.challenge.trim()),
    solution: nullableText(input.solution.trim()),
    result: nullableText(input.resultSummary.trim()),
    published_at: input.publishedAt,
  };
}

/** 發布時要補的欄位：published_at 沒填就用現在時間（DB check：published 必須有 published_at） */
export function resolvePublishTimestamps(status: ContentStatus, publishedAt: string | null, now: Date = new Date()): { publishedAt: string | null } {
  if (status !== 'published') return { publishedAt };
  return { publishedAt: publishedAt ?? now.toISOString() };
}
