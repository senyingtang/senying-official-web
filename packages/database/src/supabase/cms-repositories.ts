import type { SupabaseClient } from '@supabase/supabase-js';
import { MARKETING_ROUTES } from '@syt/shared';
import type {
  BlogCategoryOption,
  BlogPostInput,
  BlogPostSummary,
  CaseStudyInput,
  CaseStudySummary,
  ContentStatus,
} from '../cms-content';
import {
  blogPostFromRow,
  blogPostToRow,
  caseStudyFromRow,
  caseStudyToRow,
  resolvePublishTimestamps,
  SEO_ENTITY_TYPES,
  seoToRow,
  toContentStatus,
} from '../cms-content';
import type {
  CmsBlogRepository,
  CmsCaseRepository,
  CmsNavigationItemInput,
  CmsNavigationItemView,
  CmsPageOverviewItem,
  CmsStructureRepository,
  ContentListOptions,
  ContentStatusCounts,
  ContentSyncStatus,
  ContentWriteResult,
  MarketingRebuildTrigger,
  RepositoryContext,
} from '../repositories';
import { TABLES } from '../tables';
import { SupabasePermissionError, SupabaseRepositoryError, unwrap } from './errors';

/**
 * Supabase CMS repository（Phase 2.9）。
 *
 * client 必須是「使用者 session」client：可寫入的範圍完全由 RLS 決定
 * （owner / admin / editor 管理內容、author 只能改自己的未發布文章、viewer 與 customer 唯讀）。
 * RLS using 條件擋下的 update 不會報錯而是影響 0 列，因此一律以回傳列數確認。
 */

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data.filter((item) => item && typeof item === 'object') as Row[]) : []);
const single = (data: unknown): Row | null => {
  if (Array.isArray(data)) return (data[0] as Row | undefined) ?? null;
  return data && typeof data === 'object' ? (data as Row) : null;
};
const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** slug 重複（Postgres unique_violation） */
export class ContentSlugConflictError extends SupabaseRepositoryError {
  constructor(operation: string, readonly slug: string) {
    super(operation, 'slug already exists', '23505');
    this.name = 'ContentSlugConflictError';
  }
}

export function isSlugConflictError(error: unknown): boolean {
  return error instanceof ContentSlugConflictError || (error instanceof SupabaseRepositoryError && error.code === '23505');
}

const BLOG_SELECT =
  'id, slug, title, excerpt, content, status, cover_image_url, author_name, is_featured, published_at, scheduled_at, created_at, updated_at, category:blog_categories(slug, name)';
const CASE_SELECT =
  'id, slug, title, summary, content, industry, service_type, cover_image_url, client_name, is_sample, display_status, gallery, status, is_featured, sort_order, challenge, solution, result, published_at, created_at, updated_at';

export function createSupabaseCmsRepositories(
  client: SupabaseClient,
  context: RepositoryContext = {},
): {
  cmsBlog: CmsBlogRepository;
  cmsCases: CmsCaseRepository;
  cmsStructure: CmsStructureRepository;
  marketingRebuild: MarketingRebuildTrigger;
} {
  const viewer = context.viewer;
  const nowIso = () => new Date().toISOString();

  /** seo_metadata 與內容表沒有外鍵，PostgREST 無法 embed：以 entity_id 另外查一次 */
  async function readSeo(entityType: string, entityIds: string[]): Promise<Map<string, Row>> {
    if (entityIds.length === 0) return new Map();
    const data = unwrap(
      'cms.readSeo',
      await client
        .from(TABLES.cms.seoMetadata)
        .select('entity_id, seo_title, meta_description, canonical_url, og_image_url')
        .eq('entity_type', entityType)
        .in('entity_id', entityIds),
    );
    return new Map(rows(data).map((row) => [str(row.entity_id), row]));
  }

  async function writeSeo(operation: string, entityType: string, entityId: string, seo: BlogPostInput['seo']): Promise<void> {
    const payload = seoToRow(entityType, entityId, seo);
    const written = rows(unwrap(operation, await client.from(TABLES.cms.seoMetadata).upsert(payload, { onConflict: 'entity_type,entity_id' }).select('entity_id')));
    if (written.length !== 1) throw new SupabasePermissionError(operation);
  }

  /** 稽核紀錄：只記錄 id / slug / 變更欄位名稱，不存內容全文 */
  async function audit(action: string, entityType: string, entityId: string, metadata: Record<string, unknown>): Promise<boolean> {
    if (!viewer?.userId) return false;
    const result = await client.from(TABLES.cms.auditLogs).insert({
      actor_id: viewer.userId,
      actor_type: 'admin',
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: { ...metadata, changed_at: nowIso() },
    });
    if (result.error) console.error(`[${action}.audit] audit log insert failed (code=${result.error.code ?? 'unknown'})`);
    return !result.error;
  }

  const changedFields = (before: Row | null, next: Record<string, unknown>): string[] =>
    Object.keys(next).filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(next[key] ?? null));

  function mapInsertError(operation: string, slug: string, error: { message: string; code?: string } | null): never | void {
    if (!error) return;
    if (error.code === '23505') throw new ContentSlugConflictError(operation, slug);
    if (error.code === '42501') throw new SupabasePermissionError(operation);
    throw new SupabaseRepositoryError(operation, error.message, error.code ?? null);
  }

  async function countsFor(table: string): Promise<ContentStatusCounts> {
    // 只取 status：case_studies 沒有 scheduled_at 欄位
    const data = unwrap(`cms.counts.${table}`, await client.from(table).select('status'));
    const counts: ContentStatusCounts = { draft: 0, scheduled: 0, published: 0, archived: 0 };
    for (const row of rows(data)) counts[toContentStatus(row.status)] += 1;
    return counts;
  }

  // -------------------------------------------------------------------------
  // Blog
  // -------------------------------------------------------------------------
  const cmsBlog: CmsBlogRepository = {
    async listPublished(options) {
      let query = client.from(TABLES.cms.blogPosts).select(BLOG_SELECT).eq('status', 'published').lte('published_at', nowIso());
      query = query.order('published_at', { ascending: false });
      if (options?.limit) query = query.limit(options.limit);
      const data = unwrap('cmsBlog.listPublished', await query);
      return rows(data)
        .filter((row) => !row.scheduled_at || Date.parse(str(row.scheduled_at)) <= Date.now())
        .map((row) => blogPostFromRow(row));
    },
    async getPublishedBySlug(slug) {
      const data = unwrap(
        'cmsBlog.getPublishedBySlug',
        await client.from(TABLES.cms.blogPosts).select(BLOG_SELECT).eq('slug', slug).eq('status', 'published').lte('published_at', nowIso()).maybeSingle(),
      );
      const row = single(data);
      if (!row) return null;
      if (row.scheduled_at && Date.parse(str(row.scheduled_at)) > Date.now()) return null;
      const seo = await readSeo(SEO_ENTITY_TYPES.blogPost, [str(row.id)]);
      return blogPostFromRow(row, seo.get(str(row.id)));
    },
    async listAdmin(options: ContentListOptions = {}) {
      let query = client.from(TABLES.cms.blogPosts).select(BLOG_SELECT);
      if (options.status && options.status !== 'all') {
        query = options.status === 'draft' ? query.in('status', ['draft', 'review']) : query.eq('status', options.status);
      }
      if (options.featured !== undefined) query = query.eq('is_featured', options.featured);
      if (options.search?.trim()) {
        const term = options.search.trim().replace(/[%,()]/g, ' ');
        query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,excerpt.ilike.%${term}%`);
      }
      const data = unwrap('cmsBlog.listAdmin', await query.order('updated_at', { ascending: false }).limit(options.limit ?? 200));
      const list = rows(data).map((row) => blogPostFromRow(row));
      const filtered = options.category ? list.filter((post) => post.categorySlug === options.category) : list;
      return filtered.map<BlogPostSummary>(({ content: _content, readingMinutes: _reading, seo: _seo, ...summary }) => summary);
    },
    async getById(id) {
      if (!isUuid(id)) return null;
      const data = unwrap('cmsBlog.getById', await client.from(TABLES.cms.blogPosts).select(BLOG_SELECT).eq('id', id).maybeSingle());
      const row = single(data);
      if (!row) return null;
      const seo = await readSeo(SEO_ENTITY_TYPES.blogPost, [id]);
      return blogPostFromRow(row, seo.get(id));
    },
    async listCategories() {
      const data = unwrap('cmsBlog.listCategories', await client.from(TABLES.cms.blogCategories).select('id, slug, name, is_active, sort_order').order('sort_order'));
      return rows(data)
        .filter((row) => row.is_active !== false)
        .map<BlogCategoryOption>((row) => ({ id: str(row.id), slug: str(row.slug), name: str(row.name) }));
    },
    async create(input: BlogPostInput) {
      const operation = 'cmsBlog.create';
      const categories = await cmsBlog.listCategories();
      const categoryId = categories.find((item) => item.slug === input.categorySlug)?.id ?? null;
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const payload = { ...blogPostToRow(input), published_at: timestamps.publishedAt, category_id: categoryId, author_id: viewer?.userId ?? null };
      const inserted = await client.from(TABLES.cms.blogPosts).insert(payload).select('id, slug');
      mapInsertError(operation, input.slug, inserted.error);
      const row = single(inserted.data);
      if (!row) throw new SupabasePermissionError(operation);
      const id = str(row.id);
      await writeSeo(operation, SEO_ENTITY_TYPES.blogPost, id, input.seo);
      const auditLogged = await audit('cms.blog.create', TABLES.cms.blogPosts, id, { slug: input.slug, status: input.status });
      return { persisted: true, id, slug: str(row.slug), auditLogged };
    },
    async update(id, input: BlogPostInput) {
      const operation = 'cmsBlog.update';
      if (!isUuid(id)) throw new SupabaseRepositoryError(operation, 'invalid id', null);
      const before = single(unwrap(`${operation}.read`, await client.from(TABLES.cms.blogPosts).select(BLOG_SELECT).eq('id', id).maybeSingle()));
      const categories = await cmsBlog.listCategories();
      const categoryId = categories.find((item) => item.slug === input.categorySlug)?.id ?? null;
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const payload = { ...blogPostToRow(input), published_at: timestamps.publishedAt, category_id: categoryId };
      const updated = await client.from(TABLES.cms.blogPosts).update(payload).eq('id', id).select('id, slug');
      mapInsertError(operation, input.slug, updated.error);
      if (rows(updated.data).length !== 1) throw new SupabasePermissionError(operation);
      await writeSeo(operation, SEO_ENTITY_TYPES.blogPost, id, input.seo);
      const auditLogged = await audit('cms.blog.update', TABLES.cms.blogPosts, id, { slug: input.slug, changed_fields: changedFields(before, payload) });
      return { persisted: true, id, slug: input.slug, auditLogged };
    },
    publish: (id) => transition('cms.blog.publish', TABLES.cms.blogPosts, id, 'published'),
    unpublish: (id) => transition('cms.blog.unpublish', TABLES.cms.blogPosts, id, 'draft'),
    archive: (id) => transition('cms.blog.archive', TABLES.cms.blogPosts, id, 'archived'),
    countsByStatus: () => countsFor(TABLES.cms.blogPosts),
  };

  // -------------------------------------------------------------------------
  // Cases
  // -------------------------------------------------------------------------
  const cmsCases: CmsCaseRepository = {
    async listPublished(options) {
      let query = client.from(TABLES.cms.caseStudies).select(CASE_SELECT).eq('status', 'published').lte('published_at', nowIso()).order('sort_order');
      if (options?.limit) query = query.limit(options.limit);
      const data = unwrap('cmsCases.listPublished', await query);
      return rows(data).map((row) => caseStudyFromRow(row));
    },
    async getPublishedBySlug(slug) {
      const data = unwrap(
        'cmsCases.getPublishedBySlug',
        await client.from(TABLES.cms.caseStudies).select(CASE_SELECT).eq('slug', slug).eq('status', 'published').lte('published_at', nowIso()).maybeSingle(),
      );
      const row = single(data);
      if (!row) return null;
      const seo = await readSeo(SEO_ENTITY_TYPES.caseStudy, [str(row.id)]);
      return caseStudyFromRow(row, seo.get(str(row.id)));
    },
    async listAdmin(options: ContentListOptions = {}) {
      let query = client.from(TABLES.cms.caseStudies).select(CASE_SELECT);
      if (options.status && options.status !== 'all') {
        query = options.status === 'draft' ? query.in('status', ['draft', 'review']) : query.eq('status', options.status);
      }
      if (options.industry) query = query.eq('industry', options.industry);
      if (options.featured !== undefined) query = query.eq('is_featured', options.featured);
      if (options.search?.trim()) {
        const term = options.search.trim().replace(/[%,()]/g, ' ');
        query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,summary.ilike.%${term}%`);
      }
      const data = unwrap('cmsCases.listAdmin', await query.order('sort_order').limit(options.limit ?? 200));
      return rows(data)
        .map((row) => caseStudyFromRow(row))
        .map<CaseStudySummary>(({ content: _c, challenge: _ch, solution: _s, resultSummary: _r, gallery: _g, seo: _seo, ...summary }) => summary);
    },
    async getById(id) {
      if (!isUuid(id)) return null;
      const data = unwrap('cmsCases.getById', await client.from(TABLES.cms.caseStudies).select(CASE_SELECT).eq('id', id).maybeSingle());
      const row = single(data);
      if (!row) return null;
      const seo = await readSeo(SEO_ENTITY_TYPES.caseStudy, [id]);
      return caseStudyFromRow(row, seo.get(id));
    },
    async create(input: CaseStudyInput) {
      const operation = 'cmsCases.create';
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const payload = { ...caseStudyToRow(input), published_at: timestamps.publishedAt };
      const inserted = await client.from(TABLES.cms.caseStudies).insert(payload).select('id, slug');
      mapInsertError(operation, input.slug, inserted.error);
      const row = single(inserted.data);
      if (!row) throw new SupabasePermissionError(operation);
      const id = str(row.id);
      await writeSeo(operation, SEO_ENTITY_TYPES.caseStudy, id, input.seo);
      const auditLogged = await audit('cms.case.create', TABLES.cms.caseStudies, id, { slug: input.slug, status: input.status });
      return { persisted: true, id, slug: str(row.slug), auditLogged };
    },
    async update(id, input: CaseStudyInput) {
      const operation = 'cmsCases.update';
      if (!isUuid(id)) throw new SupabaseRepositoryError(operation, 'invalid id', null);
      const before = single(unwrap(`${operation}.read`, await client.from(TABLES.cms.caseStudies).select(CASE_SELECT).eq('id', id).maybeSingle()));
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const payload = { ...caseStudyToRow(input), published_at: timestamps.publishedAt };
      const updated = await client.from(TABLES.cms.caseStudies).update(payload).eq('id', id).select('id, slug');
      mapInsertError(operation, input.slug, updated.error);
      if (rows(updated.data).length !== 1) throw new SupabasePermissionError(operation);
      await writeSeo(operation, SEO_ENTITY_TYPES.caseStudy, id, input.seo);
      const auditLogged = await audit('cms.case.update', TABLES.cms.caseStudies, id, { slug: input.slug, changed_fields: changedFields(before, payload) });
      return { persisted: true, id, slug: input.slug, auditLogged };
    },
    publish: (id) => transition('cms.case.publish', TABLES.cms.caseStudies, id, 'published'),
    unpublish: (id) => transition('cms.case.unpublish', TABLES.cms.caseStudies, id, 'draft'),
    archive: (id) => transition('cms.case.archive', TABLES.cms.caseStudies, id, 'archived'),
    countsByStatus: () => countsFor(TABLES.cms.caseStudies),
  };

  /** 狀態切換：published 必須有 published_at（DB check），archived / draft 保留原本的發布時間 */
  async function transition(action: string, table: string, id: string, status: ContentStatus): Promise<ContentWriteResult> {
    const operation = action;
    if (!isUuid(id)) throw new SupabaseRepositoryError(operation, 'invalid id', null);
    const current = single(unwrap(`${operation}.read`, await client.from(table).select('id, slug, published_at').eq('id', id).maybeSingle()));
    if (!current) throw new SupabaseRepositoryError(operation, 'not found', '404');
    // draft / archived 保留原本的 published_at（DB check 只要求 published 必須有 published_at）
    const payload: Record<string, unknown> =
      status === 'published' ? { status, published_at: current.published_at ?? nowIso(), scheduled_at: null } : { status, published_at: current.published_at };
    // case_studies 沒有 scheduled_at 欄位
    if (table !== TABLES.cms.blogPosts) delete payload.scheduled_at;
    const updated = await client.from(table).update(payload).eq('id', id).select('id, slug');
    if (updated.error) {
      if (updated.error.code === '42501') throw new SupabasePermissionError(operation);
      throw new SupabaseRepositoryError(operation, updated.error.message, updated.error.code ?? null);
    }
    if (rows(updated.data).length !== 1) throw new SupabasePermissionError(operation);
    const auditLogged = await audit(action, table, id, { slug: str(current.slug), status });
    return { persisted: true, id, slug: str(current.slug), auditLogged };
  }

  // -------------------------------------------------------------------------
  // 頁面 / 選單 / SEO 總覽
  // -------------------------------------------------------------------------
  const cmsStructure: CmsStructureRepository = {
    async listPages() {
      const pages = rows(unwrap('cmsStructure.listPages', await client.from(TABLES.cms.pages).select('id, slug, title, status, updated_at')));
      const seoRows = rows(
        unwrap(
          'cmsStructure.listPageSeo',
          await client.from(TABLES.cms.seoMetadata).select('entity_id, seo_title, meta_description, canonical_url, og_image_url').eq('entity_type', SEO_ENTITY_TYPES.page),
        ),
      );
      const seoByEntity = new Map(seoRows.map((row) => [str(row.entity_id), row]));
      /** cms_pages.slug 為 home / about…；對應官網 route */
      const pageBySlug = new Map(pages.map((row) => [str(row.slug), row]));
      const slugForRoute = (route: string) => (route === '/' ? 'home' : route.split('/').filter(Boolean).at(-1) ?? '');

      return MARKETING_ROUTES.map<CmsPageOverviewItem>((route) => {
        const page = pageBySlug.get(slugForRoute(route.route)) ?? null;
        const seo = page ? seoByEntity.get(str(page.id)) : undefined;
        return {
          route: route.route,
          name: route.name,
          group: route.group,
          indexable: route.indexable,
          seoSource: seo ? 'cms' : 'code',
          seoTitle: str(seo?.seo_title),
          seoDescription: str(seo?.meta_description),
          canonicalOverride: str(seo?.canonical_url),
          cmsPageId: page ? str(page.id) : null,
          cmsPageStatus: page ? toContentStatus(page.status) : null,
          updatedAt: page ? str(page.updated_at) : null,
        };
      });
    },
    async listNavigation() {
      const data = unwrap(
        'cmsStructure.listNavigation',
        await client
          .from(TABLES.cms.navigationItems)
          .select('id, label, url, sort_order, is_active, target, menu:cms_navigation_menus(menu_key, name)')
          .order('sort_order'),
      );
      return rows(data)
        .map<CmsNavigationItemView>((row) => {
          const menu = single(row.menu);
          const menuKey = str(menu?.menu_key) === 'footer' ? 'footer' : 'header';
          return {
            id: str(row.id),
            menuKey,
            menuName: str(menu?.name, menuKey === 'footer' ? '頁尾選單' : '主選單'),
            label: str(row.label),
            href: str(row.url),
            sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
            enabled: row.is_active !== false,
            openInNewTab: str(row.target) === '_blank',
          };
        })
        .sort((a, b) => a.menuKey.localeCompare(b.menuKey) || a.sortOrder - b.sortOrder);
    },
    async updateNavigationItem(id, input: CmsNavigationItemInput) {
      const operation = 'cmsStructure.updateNavigationItem';
      if (!isUuid(id)) throw new SupabaseRepositoryError(operation, 'invalid id', null);
      const payload = { label: input.label, url: input.href, sort_order: input.sortOrder, is_active: input.enabled, target: input.openInNewTab ? '_blank' : '_self' };
      const updated = await client.from(TABLES.cms.navigationItems).update(payload).eq('id', id).select('id, url');
      if (updated.error) {
        if (updated.error.code === '42501') throw new SupabasePermissionError(operation);
        throw new SupabaseRepositoryError(operation, updated.error.message, updated.error.code ?? null);
      }
      if (rows(updated.data).length !== 1) throw new SupabasePermissionError(operation);
      const auditLogged = await audit('cms.navigation.update', TABLES.cms.navigationItems, id, { href: input.href, enabled: input.enabled });
      return { persisted: true, id, slug: input.href, auditLogged };
    },
  };

  // -------------------------------------------------------------------------
  // Marketing rebuild
  // -------------------------------------------------------------------------
  const marketingRebuild: MarketingRebuildTrigger = {
    async getStatus() {
      const [blog, cases, requests] = await Promise.all([
        client.from(TABLES.cms.blogPosts).select('updated_at').order('updated_at', { ascending: false }).limit(1),
        client.from(TABLES.cms.caseStudies).select('updated_at').order('updated_at', { ascending: false }).limit(1),
        client.from(TABLES.cms.marketingRebuildRequests).select('id, status, reason, completed_at, created_at').order('created_at', { ascending: false }).limit(20),
      ]);
      const latest = [single(blog.data)?.updated_at, single(cases.data)?.updated_at].map((value) => str(value)).filter(Boolean).sort().at(-1) ?? null;
      const requestRows = rows(requests.data);
      const lastBuild = requestRows.find((row) => str(row.status) === 'synced');
      const pending = requestRows.find((row) => str(row.status) === 'pending' || str(row.status) === 'building');
      const lastMarketingBuildAt = lastBuild ? str(lastBuild.completed_at) || null : null;
      const failed = requestRows[0] && str(requestRows[0].status) === 'failed';
      const stale = Boolean(pending) || (latest !== null && (lastMarketingBuildAt === null || latest > lastMarketingBuildAt));
      return {
        state: failed ? 'failed' : str(pending?.status) === 'building' ? 'building' : stale ? 'rebuild_required' : 'synced',
        lastContentUpdatedAt: latest,
        lastMarketingBuildAt,
        pendingReason: pending ? str(pending.reason) : null,
        persisted: true,
      } satisfies ContentSyncStatus;
    },
    async trigger(reason) {
      // 內容儲存後只記錄「需要重新建置」；Phase 3.1 由 deploy provider webhook 接手，介面不變
      const inserted = await client
        .from(TABLES.cms.marketingRebuildRequests)
        .insert({ reason, status: 'pending', requested_by: viewer?.userId ?? null })
        .select('id');
      if (inserted.error) console.error(`[marketingRebuild.trigger] insert failed (code=${inserted.error.code ?? 'unknown'})`);
      return marketingRebuild.getStatus();
    },
  };

  return { cmsBlog, cmsCases, cmsStructure, marketingRebuild };
}
