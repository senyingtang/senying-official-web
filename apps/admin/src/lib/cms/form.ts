import type { BlogPostInput, CaseStudyInput, ContentSeo, ContentStatus, GalleryImage } from '@syt/database/cms-content';
import { CONTENT_STATUSES, normalizeSlug } from '@syt/database/cms-content';

/**
 * 後台 CMS 表單解析（FormData → repository input）。
 * 欄位名稱與 validateBlogPostInput / validateCaseStudyInput 的 errors key 一致，錯誤才能顯示在對應欄位旁。
 */

export type ContentFormStatus = 'idle' | 'saved' | 'invalid' | 'forbidden' | 'conflict' | 'mock' | 'error';

export interface ContentFormState {
  status: ContentFormStatus;
  message: string;
  errors: Record<string, string>;
  /** 新增成功後由 server action 回傳，用於導向編輯頁 */
  savedId?: string;
}

export const initialContentFormState: ContentFormState = { status: 'idle', message: '', errors: {} };

/** 相簿欄位固定 4 組（Phase 2.9 不做動態增減） */
export const GALLERY_SLOTS = 4;

const text = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
};
const raw = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : '';
};
const checkbox = (form: FormData, name: string): boolean => form.get(name) === 'on' || form.get(name) === 'true';

const status = (form: FormData): ContentStatus => {
  const value = text(form, 'status');
  return (CONTENT_STATUSES as readonly string[]).includes(value) ? (value as ContentStatus) : 'draft';
};

/** datetime-local（使用者所在時區）→ ISO；空值回傳 null */
export function parseDateTimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
}

/** ISO → datetime-local 的 value（YYYY-MM-DDTHH:mm，以瀏覽器 / 伺服器本地時區呈現） */
export function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseSeo(form: FormData): ContentSeo {
  return {
    seoTitle: text(form, 'seo_title'),
    seoDescription: text(form, 'seo_description'),
    ogImageUrl: text(form, 'og_image_url'),
    canonicalOverride: text(form, 'canonical_override'),
  };
}

export function parseBlogPostForm(form: FormData): BlogPostInput {
  const nextStatus = status(form);
  return {
    slug: normalizeSlug(text(form, 'slug')),
    title: text(form, 'title'),
    excerpt: text(form, 'excerpt'),
    content: raw(form, 'content'),
    status: nextStatus,
    categorySlug: text(form, 'category_slug'),
    coverImageUrl: text(form, 'cover_image_url'),
    authorName: text(form, 'author_name'),
    isFeatured: checkbox(form, 'is_featured'),
    publishedAt: parseDateTimeLocal(text(form, 'published_at')),
    scheduledAt: nextStatus === 'scheduled' ? parseDateTimeLocal(text(form, 'scheduled_at')) : null,
    seo: parseSeo(form),
  };
}

export function parseCaseStudyForm(form: FormData): CaseStudyInput {
  const gallery: GalleryImage[] = [];
  for (let index = 0; index < GALLERY_SLOTS; index += 1) {
    const url = text(form, `gallery.${index}.url`);
    if (url) gallery.push({ url, alt: text(form, `gallery.${index}.alt`) });
  }
  const sortOrderRaw = text(form, 'sort_order');
  return {
    slug: normalizeSlug(text(form, 'slug')),
    title: text(form, 'title'),
    excerpt: text(form, 'excerpt'),
    content: raw(form, 'content'),
    industry: text(form, 'industry'),
    serviceType: text(form, 'service_type'),
    coverImageUrl: text(form, 'cover_image_url'),
    clientLabel: text(form, 'client_label'),
    isSample: checkbox(form, 'is_sample'),
    displayStatus: text(form, 'display_status'),
    gallery,
    status: status(form),
    isFeatured: checkbox(form, 'is_featured'),
    sortOrder: sortOrderRaw === '' ? 0 : Number(sortOrderRaw),
    challenge: raw(form, 'challenge').trim(),
    solution: raw(form, 'solution').trim(),
    resultSummary: raw(form, 'result_summary').trim(),
    publishedAt: parseDateTimeLocal(text(form, 'published_at')),
    seo: parseSeo(form),
  };
}
