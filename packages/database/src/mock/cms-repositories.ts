import { MARKETING_ROUTES } from '@syt/shared';
import type {
  BlogPostDetail,
  BlogPostInput,
  BlogPostSummary,
  CaseStudyDetail,
  CaseStudyInput,
  CaseStudySummary,
  ContentStatus,
} from '../cms-content';
import { CONTENT_STATUSES, isPubliclyVisible, resolvePublishTimestamps } from '../cms-content';
import type {
  CmsBlogRepository,
  CmsCaseRepository,
  CmsNavigationItemInput,
  CmsPageOverviewItem,
  CmsStructureRepository,
  ContentListOptions,
  ContentStatusCounts,
  ContentSyncStatus,
  ContentWriteResult,
  MarketingRebuildTrigger,
  RepositoryContext,
} from '../repositories';
import { SupabasePermissionError } from '../supabase/errors';
import { MOCK_BLOG_CATEGORIES, MOCK_BLOG_POSTS, MOCK_CASE_STUDIES, MOCK_NAVIGATION_ITEMS } from './cms-content';

/**
 * Mock CMS repository：行為對齊 RLS（角色可寫範圍、前台只看得到已發布內容），但只改記憶體。
 * 回傳 persisted = false，後台會明確顯示「mock 模式不會寫入資料庫」。
 */

const clone = <T>(value: T): T => structuredClone(value);
const blogPosts: BlogPostDetail[] = clone(MOCK_BLOG_POSTS);
const caseStudies: CaseStudyDetail[] = clone(MOCK_CASE_STUDIES);
const navigationItems = clone(MOCK_NAVIGATION_ITEMS);

const rebuildState: { lastMarketingBuildAt: string | null; pendingReason: string | null } = {
  lastMarketingBuildAt: new Date('2025-09-01T02:00:00Z').toISOString(),
  pendingReason: null,
};

const summaryOfPost = (post: BlogPostDetail): BlogPostSummary => {
  const { content: _content, readingMinutes: _readingMinutes, seo: _seo, ...summary } = post;
  return summary;
};
const summaryOfCase = (item: CaseStudyDetail): CaseStudySummary => {
  const { content: _content, challenge: _challenge, solution: _solution, resultSummary: _result, gallery: _gallery, seo: _seo, ...summary } = item;
  return summary;
};

const matchesSearch = (search: string | undefined, haystack: string[]): boolean => {
  const query = (search ?? '').trim().toLowerCase();
  if (!query) return true;
  return haystack.some((value) => value.toLowerCase().includes(query));
};

function emptyCounts(): ContentStatusCounts {
  return { draft: 0, scheduled: 0, published: 0, archived: 0 };
}

function countBy(items: { status: ContentStatus }[]): ContentStatusCounts {
  const counts = emptyCounts();
  for (const item of items) counts[item.status] += 1;
  return counts;
}

const nowIso = () => new Date().toISOString();

export function createMockCmsRepositories(context: RepositoryContext = {}): {
  cmsBlog: CmsBlogRepository;
  cmsCases: CmsCaseRepository;
  cmsStructure: CmsStructureRepository;
  marketingRebuild: MarketingRebuildTrigger;
} {
  const role = context.viewer?.scope === 'admin' ? context.viewer.adminRole : null;
  const canManageContent = role === 'owner' || role === 'admin' || role === 'editor';
  const canManageSettings = role === 'owner' || role === 'admin';
  /** author：只能建立 / 編輯未發布的文章（對應 RLS posts_author_insert / posts_author_update） */
  const authorDraftOnly = role === 'author';

  const assertBlogWrite = (operation: string, status: ContentStatus): void => {
    if (canManageContent) return;
    if (authorDraftOnly && (status === 'draft' || status === 'scheduled')) return;
    throw new SupabasePermissionError(operation);
  };
  const assertCaseWrite = (operation: string): void => {
    if (!canManageContent) throw new SupabasePermissionError(operation);
  };
  const assertSettingsWrite = (operation: string): void => {
    if (!canManageSettings) throw new SupabasePermissionError(operation);
  };

  const touchContent = (): void => {
    rebuildState.pendingReason = rebuildState.pendingReason ?? '內容已更新';
  };

  const result = (id: string, slug: string): ContentWriteResult => ({ persisted: false, id, slug, auditLogged: false });

  const cmsBlog: CmsBlogRepository = {
    async listPublished(options) {
      const visible = blogPosts.filter((post) => isPubliclyVisible(post.status, post.publishedAt, post.scheduledAt));
      visible.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
      return clone(visible.slice(0, options?.limit ?? visible.length).map(summaryOfPost));
    },
    async getPublishedBySlug(slug) {
      const post = blogPosts.find((item) => item.slug === slug && isPubliclyVisible(item.status, item.publishedAt, item.scheduledAt));
      return post ? clone(post) : null;
    },
    async listAdmin(options: ContentListOptions = {}) {
      const items = blogPosts
        .filter((post) => (options.status && options.status !== 'all' ? post.status === options.status : true))
        .filter((post) => (options.category ? post.categorySlug === options.category : true))
        .filter((post) => (options.featured === undefined ? true : post.isFeatured === options.featured))
        .filter((post) => matchesSearch(options.search, [post.title, post.slug, post.excerpt]));
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return clone(items.slice(0, options.limit ?? items.length).map(summaryOfPost));
    },
    async getById(id) {
      const post = blogPosts.find((item) => item.id === id);
      return post ? clone(post) : null;
    },
    async listCategories() {
      return clone(MOCK_BLOG_CATEGORIES);
    },
    async create(input: BlogPostInput) {
      assertBlogWrite('cmsBlog.create', input.status);
      if (blogPosts.some((post) => post.slug === input.slug)) throw new Error('slug_conflict');
      const category = MOCK_BLOG_CATEGORIES.find((item) => item.slug === input.categorySlug);
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const post: BlogPostDetail = {
        id: `mock-blog-${Date.now()}`,
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        readingMinutes: 1,
        status: input.status,
        categorySlug: category?.slug ?? '',
        categoryName: category?.name ?? '未分類',
        coverImageUrl: input.coverImageUrl,
        authorName: input.authorName,
        isFeatured: input.isFeatured,
        publishedAt: timestamps.publishedAt,
        scheduledAt: input.scheduledAt,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        seo: { ...input.seo },
      };
      blogPosts.push(post);
      touchContent();
      return result(post.id, post.slug);
    },
    async update(id, input: BlogPostInput) {
      const post = blogPosts.find((item) => item.id === id);
      if (!post) throw new Error('not_found');
      assertBlogWrite('cmsBlog.update', input.status);
      if (blogPosts.some((item) => item.slug === input.slug && item.id !== id)) throw new Error('slug_conflict');
      const category = MOCK_BLOG_CATEGORIES.find((item) => item.slug === input.categorySlug);
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      Object.assign(post, {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        status: input.status,
        categorySlug: category?.slug ?? '',
        categoryName: category?.name ?? '未分類',
        coverImageUrl: input.coverImageUrl,
        authorName: input.authorName,
        isFeatured: input.isFeatured,
        publishedAt: timestamps.publishedAt,
        scheduledAt: input.scheduledAt,
        updatedAt: nowIso(),
        seo: { ...input.seo },
      });
      touchContent();
      return result(post.id, post.slug);
    },
    async publish(id) {
      const post = blogPosts.find((item) => item.id === id);
      if (!post) throw new Error('not_found');
      assertBlogWrite('cmsBlog.publish', 'published');
      post.status = 'published';
      post.publishedAt = post.publishedAt ?? nowIso();
      post.scheduledAt = null;
      post.updatedAt = nowIso();
      touchContent();
      return result(post.id, post.slug);
    },
    async unpublish(id) {
      const post = blogPosts.find((item) => item.id === id);
      if (!post) throw new Error('not_found');
      assertBlogWrite('cmsBlog.unpublish', 'draft');
      post.status = 'draft';
      post.updatedAt = nowIso();
      touchContent();
      return result(post.id, post.slug);
    },
    async archive(id) {
      const post = blogPosts.find((item) => item.id === id);
      if (!post) throw new Error('not_found');
      assertBlogWrite('cmsBlog.archive', 'archived');
      post.status = 'archived';
      post.updatedAt = nowIso();
      touchContent();
      return result(post.id, post.slug);
    },
    async countsByStatus() {
      return countBy(blogPosts);
    },
  };

  const cmsCases: CmsCaseRepository = {
    async listPublished(options) {
      const visible = caseStudies.filter((item) => isPubliclyVisible(item.status, item.publishedAt));
      visible.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-Hant'));
      return clone(visible.slice(0, options?.limit ?? visible.length).map(summaryOfCase));
    },
    async getPublishedBySlug(slug) {
      const item = caseStudies.find((entry) => entry.slug === slug && isPubliclyVisible(entry.status, entry.publishedAt));
      return item ? clone(item) : null;
    },
    async listAdmin(options: ContentListOptions = {}) {
      const items = caseStudies
        .filter((item) => (options.status && options.status !== 'all' ? item.status === options.status : true))
        .filter((item) => (options.industry ? item.industry === options.industry : true))
        .filter((item) => (options.featured === undefined ? true : item.isFeatured === options.featured))
        .filter((item) => matchesSearch(options.search, [item.title, item.slug, item.excerpt, item.industry, item.serviceType]));
      items.sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
      return clone(items.slice(0, options.limit ?? items.length).map(summaryOfCase));
    },
    async getById(id) {
      const item = caseStudies.find((entry) => entry.id === id);
      return item ? clone(item) : null;
    },
    async create(input: CaseStudyInput) {
      assertCaseWrite('cmsCases.create');
      if (caseStudies.some((item) => item.slug === input.slug)) throw new Error('slug_conflict');
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      const item: CaseStudyDetail = {
        id: `mock-case-${Date.now()}`,
        ...input,
        publishedAt: timestamps.publishedAt,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        gallery: [...input.gallery],
        seo: { ...input.seo },
      };
      caseStudies.push(item);
      touchContent();
      return result(item.id, item.slug);
    },
    async update(id, input: CaseStudyInput) {
      const item = caseStudies.find((entry) => entry.id === id);
      if (!item) throw new Error('not_found');
      assertCaseWrite('cmsCases.update');
      if (caseStudies.some((entry) => entry.slug === input.slug && entry.id !== id)) throw new Error('slug_conflict');
      const timestamps = resolvePublishTimestamps(input.status, input.publishedAt);
      Object.assign(item, { ...input, publishedAt: timestamps.publishedAt, gallery: [...input.gallery], seo: { ...input.seo }, updatedAt: nowIso() });
      touchContent();
      return result(item.id, item.slug);
    },
    async publish(id) {
      const item = caseStudies.find((entry) => entry.id === id);
      if (!item) throw new Error('not_found');
      assertCaseWrite('cmsCases.publish');
      item.status = 'published';
      item.publishedAt = item.publishedAt ?? nowIso();
      item.updatedAt = nowIso();
      touchContent();
      return result(item.id, item.slug);
    },
    async unpublish(id) {
      const item = caseStudies.find((entry) => entry.id === id);
      if (!item) throw new Error('not_found');
      assertCaseWrite('cmsCases.unpublish');
      item.status = 'draft';
      item.updatedAt = nowIso();
      touchContent();
      return result(item.id, item.slug);
    },
    async archive(id) {
      const item = caseStudies.find((entry) => entry.id === id);
      if (!item) throw new Error('not_found');
      assertCaseWrite('cmsCases.archive');
      item.status = 'archived';
      item.updatedAt = nowIso();
      touchContent();
      return result(item.id, item.slug);
    },
    async countsByStatus() {
      return countBy(caseStudies);
    },
  };

  const cmsStructure: CmsStructureRepository = {
    async listPages() {
      return MARKETING_ROUTES.map<CmsPageOverviewItem>((route) => ({
        route: route.route,
        name: route.name,
        group: route.group,
        indexable: route.indexable,
        seoSource: 'code',
        seoTitle: '',
        seoDescription: '',
        canonicalOverride: '',
        cmsPageId: null,
        cmsPageStatus: null,
        updatedAt: null,
      }));
    },
    async listNavigation() {
      return clone([...navigationItems].sort((a, b) => a.menuKey.localeCompare(b.menuKey) || a.sortOrder - b.sortOrder));
    },
    async updateNavigationItem(id, input: CmsNavigationItemInput) {
      const item = navigationItems.find((entry) => entry.id === id);
      if (!item) throw new Error('not_found');
      assertSettingsWrite('cmsStructure.updateNavigationItem');
      Object.assign(item, input);
      touchContent();
      return result(item.id, item.href);
    },
  };

  const marketingRebuild: MarketingRebuildTrigger = {
    async getStatus() {
      const lastContentUpdatedAt = [...blogPosts.map((post) => post.updatedAt), ...caseStudies.map((item) => item.updatedAt)].sort().at(-1) ?? null;
      const stale =
        rebuildState.pendingReason !== null ||
        (lastContentUpdatedAt !== null && rebuildState.lastMarketingBuildAt !== null && lastContentUpdatedAt > rebuildState.lastMarketingBuildAt);
      return {
        state: stale ? 'rebuild_required' : 'synced',
        lastContentUpdatedAt,
        lastMarketingBuildAt: rebuildState.lastMarketingBuildAt,
        pendingReason: rebuildState.pendingReason,
        persisted: false,
      } satisfies ContentSyncStatus;
    },
    async trigger(reason) {
      rebuildState.pendingReason = reason;
      return marketingRebuild.getStatus();
    },
  };

  void CONTENT_STATUSES;
  return { cmsBlog, cmsCases, cmsStructure, marketingRebuild };
}
