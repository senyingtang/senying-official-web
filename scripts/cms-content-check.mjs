// Phase 2.9 CMS 內容驗收（30 項，對應任務說明第二十二節）
//
// 只連本專案 local Supabase（API 54421 / DB 54422）。所有寫入測試都在 finally 清除。
//
//   1–3   repository 介面（mock）：Blog / Case / mock 模式只回傳已發布內容
//   4–6   Supabase 模式：anon 讀已發布、讀不到 draft / scheduled / archived、不可寫入
//   7–14  角色權限（真實 GoTrue 登入 + RLS）：owner / admin / editor / viewer / customer、slug 唯一、sanitize、audit
//  15–24  靜態 build 輸出：Blog / Cases 列表與內容頁、未發布內容不進 build、metadata / Breadcrumb / JSON-LD
//  25–26  搜尋索引存在且不含 private content
//  27–30  Admin（DATA_SOURCE=supabase）：Dashboard 不 crash，CMS navigation / pages / SEO 可進入
//
// 前置：本機 Supabase 已啟動（pnpm supabase:start）、pnpm build 已產生 apps/marketing/dist 與 apps/admin/.next。
// 用法：pnpm cms:verify [--skip-admin]
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { loadDatabaseBundle, loadMarkdownModule } from './lib/database-bundle.mjs';
import { cleanupTestAccounts, ensureTestAccounts } from './lib/local-fixtures.mjs';
import { appEnv, getLocalSupabaseEnv, psql, psqlJson, sqlLiteral } from './lib/local-supabase.mjs';
import { findChrome, installSignalCleanup, ROOT, startAdminServer, stopAll } from './lib/servers.mjs';
import { createReport, DIST, htmlPath, jsonLdOfType, metaContent, read, titleOf } from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.9 CMS content verify');
const { record } = report;
const REPORT_DIR = path.join(ROOT, '.phase29-report');
const require = createRequire(path.join(ROOT, 'packages', 'database', 'package.json'));
const { createClient } = require('@supabase/supabase-js');

/** 測試內容一律用這組前綴，方便 finally 清除 */
const PREFIX = 'cmsverify';
const slugFor = (name) => `${PREFIX}-${name}`;
const TEST_SLUGS = ['blog-owner', 'blog-admin', 'blog-editor', 'blog-author', 'blog-viewer', 'blog-customer', 'blog-dup', 'blog-sanitize', 'case-owner', 'case-editor'].map(slugFor);

const seoInput = { seoTitle: '', seoDescription: '', ogImageUrl: '', canonicalOverride: '' };
const blogInput = (slug, overrides = {}) => ({
  slug,
  title: `CMS 驗收文章 ${slug}`,
  excerpt: '驗收用文章，執行結束後會刪除。',
  content: '## 驗收\n\n這是驗收內容。',
  status: 'draft',
  categorySlug: 'seo',
  coverImageUrl: '',
  authorName: '驗收',
  isFeatured: false,
  publishedAt: null,
  scheduledAt: null,
  seo: { ...seoInput },
  ...overrides,
});
const caseInput = (slug, overrides = {}) => ({
  slug,
  title: `CMS 驗收案例 ${slug}`,
  excerpt: '驗收用案例，執行結束後會刪除。',
  content: '## 驗收\n\n這是驗收內容。',
  industry: '品牌形象',
  serviceType: 'SEO 形象官網',
  coverImageUrl: '',
  clientLabel: '版型示意',
  isSample: true,
  displayStatus: '版型示意',
  gallery: [],
  status: 'draft',
  isFeatured: false,
  sortOrder: 900,
  challenge: '',
  solution: '',
  resultSummary: '',
  publishedAt: null,
  seo: { ...seoInput },
  ...overrides,
});

const cleanupContent = () => {
  const list = TEST_SLUGS.map((slug) => sqlLiteral(slug)).join(', ');
  psql(`begin;
    delete from public.seo_metadata where entity_id in (select id from public.blog_posts where slug in (${list}));
    delete from public.seo_metadata where entity_id in (select id from public.case_studies where slug in (${list}));
    delete from public.blog_posts where slug in (${list});
    delete from public.case_studies where slug in (${list});
    delete from public.marketing_rebuild_requests where reason like '%驗收%' or reason like '%${PREFIX}%';
  commit;`);
  // audit_logs 為 append-only（0012 trigger）：驗收自己產生的紀錄以 replica 模式清除，本機 DB 才能重複執行
  psql(`begin;
    set local session_replication_role = replica;
    delete from public.audit_logs where action like 'cms.%' and metadata ->> 'slug' like '${PREFIX}-%';
  commit;`);
};

let env;
try {
  env = getLocalSupabaseEnv();
} catch (error) {
  record(1, '本機 Supabase 可連線', false, error.message);
  report.finish('cms:verify');
}

const db = await loadDatabaseBundle(REPORT_DIR);
const markdown = await loadMarkdownModule();
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const servers = [];
installSignalCleanup(servers);
let browser;
let accounts;

// ---------------------------------------------------------------------------
// 1–3. Mock repository
// ---------------------------------------------------------------------------
{
  const mock = db.createMockRepositories({ viewer: { userId: 'mock-owner', email: 'owner@example.com', scope: 'admin', adminRole: 'owner', workspaceIds: [] } });
  const published = await mock.cmsBlog.listPublished();
  const counts = await mock.cmsBlog.countsByStatus();
  const draftHidden = (await mock.cmsBlog.getPublishedBySlug('launch-checklist')) === null;
  const scheduledHidden = (await mock.cmsBlog.getPublishedBySlug('faq-schema-guide')) === null;
  const archivedHidden = (await mock.cmsBlog.getPublishedBySlug('redeem-access-code')) === null;
  const created = await mock.cmsBlog.create(blogInput(slugFor('blog-mock')));
  const updated = await mock.cmsBlog.update(created.id, blogInput(slugFor('blog-mock'), { title: '已更新' }));
  const publishedAgain = await mock.cmsBlog.publish(created.id);
  const visibleAfterPublish = (await mock.cmsBlog.getPublishedBySlug(slugFor('blog-mock'))) !== null;
  await mock.cmsBlog.archive(created.id);
  const goneAfterArchive = (await mock.cmsBlog.getPublishedBySlug(slugFor('blog-mock'))) === null;
  record(
    1,
    'Blog repository：listPublished / getPublishedBySlug / listAdmin / create / update / publish / archive',
    published.length >= 3 &&
      published.every((post) => post.status === 'published') &&
      draftHidden &&
      scheduledHidden &&
      archivedHidden &&
      created.id !== '' &&
      updated.slug === slugFor('blog-mock') &&
      publishedAgain.persisted === false &&
      visibleAfterPublish &&
      goneAfterArchive,
    `published=${published.length} counts=${JSON.stringify(counts)} draftHidden=${draftHidden} scheduledHidden=${scheduledHidden} archivedHidden=${archivedHidden}`,
  );

  const cases = await mock.cmsCases.listPublished();
  const caseCreated = await mock.cmsCases.create(caseInput(slugFor('case-mock')));
  await mock.cmsCases.publish(caseCreated.id);
  const caseVisible = (await mock.cmsCases.getPublishedBySlug(slugFor('case-mock'))) !== null;
  await mock.cmsCases.archive(caseCreated.id);
  const caseGone = (await mock.cmsCases.getPublishedBySlug(slugFor('case-mock'))) === null;
  const caseDraftHidden = (await mock.cmsCases.getPublishedBySlug('sample-clinic-site')) === null;
  record(
    2,
    'Case repository：listPublished / getPublishedBySlug / listAdmin / create / update / publish / archive',
    cases.length >= 8 && cases.every((item) => item.status === 'published') && caseVisible && caseGone && caseDraftHidden,
    `published=${cases.length} caseVisible=${caseVisible} caseGone=${caseGone} draftHidden=${caseDraftHidden}`,
  );

  const viewerRepos = db.createMockRepositories({ viewer: { userId: 'mock-viewer', email: 'viewer@example.com', scope: 'admin', adminRole: 'viewer', workspaceIds: [] } });
  let viewerDenied = false;
  try {
    await viewerRepos.cmsBlog.create(blogInput(slugFor('blog-mock-viewer')));
  } catch (error) {
    viewerDenied = db.isPermissionDeniedError(error);
  }
  const config = db.resolveDataSourceConfig({ DATA_SOURCE: 'mock' });
  const mockRepos = db.createRepositories(config);
  record(
    3,
    'mock mode：DATA_SOURCE=mock 使用 mock repository，寫入不落地（persisted=false）且角色權限與 RLS 一致',
    config.kind === 'mock' && typeof mockRepos.cmsBlog.listPublished === 'function' && created.persisted === false && viewerDenied,
    `kind=${config.kind} persisted=${created.persisted} viewerDenied=${viewerDenied}`,
  );
}

// ---------------------------------------------------------------------------
// 4–14. Supabase 模式
// ---------------------------------------------------------------------------
try {
  cleanupContent();
  accounts = await ensureTestAccounts(env);

  const anonClient = createClient(env.apiUrl, env.anonKey, clientOptions);
  const anonRepos = db.createSupabaseRepositories(anonClient);

  // 4. Supabase mode
  const supabaseConfig = db.resolveDataSourceConfig({ DATA_SOURCE: 'supabase', PUBLIC_SUPABASE_URL: env.apiUrl, PUBLIC_SUPABASE_ANON_KEY: env.anonKey });
  const anonPosts = await anonRepos.cmsBlog.listPublished();
  const anonCases = await anonRepos.cmsCases.listPublished();
  const dbPublished = psqlJson("select json_build_object('posts', (select count(*) from public.blog_posts where status='published'), 'cases', (select count(*) from public.case_studies where status='published'))");
  record(
    4,
    'Supabase mode：DATA_SOURCE=supabase 使用 Supabase repository，已發布內容與 DB 一致',
    supabaseConfig.kind === 'supabase' && anonPosts.length === dbPublished.posts && anonCases.length === dbPublished.cases,
    `repository posts=${anonPosts.length}/${dbPublished.posts} cases=${anonCases.length}/${dbPublished.cases}`,
  );

  // 5. anon published read（PostgREST）
  const anonPostRead = await anonClient.from('blog_posts').select('slug, status');
  const anonCaseRead = await anonClient.from('case_studies').select('slug, status');
  record(
    5,
    'anon published read：只讀得到已發布且發布時間已到的文章與案例',
    !anonPostRead.error &&
      !anonCaseRead.error &&
      (anonPostRead.data ?? []).length === dbPublished.posts &&
      (anonPostRead.data ?? []).every((row) => row.status === 'published') &&
      (anonCaseRead.data ?? []).length === dbPublished.cases,
    `posts=${(anonPostRead.data ?? []).length} cases=${(anonCaseRead.data ?? []).length}`,
  );

  // 6. anon draft denied
  psql(`insert into public.blog_posts(slug, title, content, status, published_at, scheduled_at) values
    (${sqlLiteral(slugFor('blog-viewer'))}, 'draft probe', '', 'draft', null, null),
    (${sqlLiteral(slugFor('blog-customer'))}, 'scheduled probe', '', 'published', now() + interval '10 years', now() + interval '10 years'),
    (${sqlLiteral(slugFor('blog-dup'))}, 'archived probe', '', 'archived', now() - interval '1 day', null);`);
  const anonHidden = await anonClient.from('blog_posts').select('slug').in('slug', [slugFor('blog-viewer'), slugFor('blog-customer'), slugFor('blog-dup')]);
  const anonDraftDetail = await anonRepos.cmsBlog.getPublishedBySlug(slugFor('blog-viewer'));
  record(
    6,
    'anon draft denied：草稿 / 未到期排程 / 已下架內容一律讀不到',
    !anonHidden.error && (anonHidden.data ?? []).length === 0 && anonDraftDetail === null,
    `visible=${(anonHidden.data ?? []).length}`,
  );

  const repoFor = async (role) => {
    const client = createClient(env.apiUrl, env.anonKey, clientOptions);
    const { error } = await client.auth.signInWithPassword({ email: accounts[role].email, password: accounts[role].password });
    if (error) throw new Error(`${role} 登入失敗`);
    return db.createSupabaseRepositories(client, {
      viewer: { userId: accounts[role].id, email: accounts[role].email, scope: 'admin', adminRole: role === 'customer' ? null : role, workspaceIds: [] },
    });
  };

  const auditFrom = Number(psqlJson('select coalesce(max(id), 0) from public.audit_logs'));

  // 7. owner CRUD
  const owner = await repoFor('owner');
  const ownerCreated = await owner.cmsBlog.create(blogInput(slugFor('blog-owner')));
  const ownerUpdated = await owner.cmsBlog.update(ownerCreated.id, blogInput(slugFor('blog-owner'), { title: 'owner 已更新', status: 'draft' }));
  await owner.cmsBlog.publish(ownerCreated.id);
  const ownerPublic = await anonRepos.cmsBlog.getPublishedBySlug(slugFor('blog-owner'));
  await owner.cmsBlog.archive(ownerCreated.id);
  const ownerArchivedHidden = (await anonRepos.cmsBlog.getPublishedBySlug(slugFor('blog-owner'))) === null;
  const ownerCase = await owner.cmsCases.create(caseInput(slugFor('case-owner')));
  record(
    7,
    'owner CRUD：建立 / 修改 / 發布 / 下架文章與案例（真實登入 + RLS）',
    ownerCreated.persisted && ownerUpdated.persisted && ownerPublic !== null && ownerArchivedHidden && ownerCase.persisted,
    `created=${ownerCreated.id.slice(0, 8)} publicAfterPublish=${ownerPublic !== null} hiddenAfterArchive=${ownerArchivedHidden}`,
  );

  // 8. admin CRUD
  const admin = await repoFor('admin');
  const adminCreated = await admin.cmsBlog.create(blogInput(slugFor('blog-admin'), { status: 'published', publishedAt: new Date().toISOString() }));
  const adminVisible = (await anonRepos.cmsBlog.getPublishedBySlug(slugFor('blog-admin'))) !== null;
  const adminEditedOthers = await admin.cmsBlog.update(ownerCreated.id, blogInput(slugFor('blog-owner'), { title: 'admin 修改 owner 的文章' }));
  record(
    8,
    'admin CRUD：可建立已發布文章，也可以修改其他人建立的內容',
    adminCreated.persisted && adminVisible && adminEditedOthers.persisted,
    `created=${adminCreated.persisted} visible=${adminVisible} editedOthers=${adminEditedOthers.persisted}`,
  );

  // 9. editor permission
  const editor = await repoFor('editor');
  const editorBlog = await editor.cmsBlog.create(blogInput(slugFor('blog-editor')));
  const editorCase = await editor.cmsCases.create(caseInput(slugFor('case-editor')));
  let editorSettingsDenied = false;
  try {
    const settings = await editor.siteSettings.getMarketingSiteSettings();
    await editor.siteSettings.updateMarketingSiteSettings({ ...settings, brand: { ...settings.brand, footerBrandName: 'CMS VERIFY' } });
  } catch (error) {
    editorSettingsDenied = db.isPermissionDeniedError(error);
  }
  record(
    9,
    'editor permission：可管理文章與案例，但不能修改全站設定',
    editorBlog.persisted && editorCase.persisted && editorSettingsDenied,
    `blog=${editorBlog.persisted} case=${editorCase.persisted} settingsDenied=${editorSettingsDenied}`,
  );

  // 10. viewer read-only
  const viewer = await repoFor('viewer');
  const viewerList = await viewer.cmsBlog.listAdmin({ limit: 200 });
  const viewerDenied = [];
  for (const [label, run] of [
    ['create', () => viewer.cmsBlog.create(blogInput(slugFor('blog-viewer-new')))],
    ['update', () => viewer.cmsBlog.update(ownerCreated.id, blogInput(slugFor('blog-owner')))],
    ['publish', () => viewer.cmsBlog.publish(ownerCreated.id)],
    ['caseCreate', () => viewer.cmsCases.create(caseInput(slugFor('case-viewer')))],
  ]) {
    try {
      await run();
      viewerDenied.push(`${label}:allowed`);
    } catch (error) {
      viewerDenied.push(`${label}:${db.isPermissionDeniedError(error) ? 'denied' : 'error'}`);
    }
  }
  record(
    10,
    'viewer read-only：可以看到全部內容（含草稿），任何寫入都被 RLS 拒絕',
    viewerList.length > 0 && viewerDenied.every((item) => item.endsWith(':denied')),
    `list=${viewerList.length} ${viewerDenied.join(' · ')}`,
  );

  // 11. customer denied write
  const customer = await repoFor('customer');
  const customerResults = [];
  for (const [label, run] of [
    ['blogCreate', () => customer.cmsBlog.create(blogInput(slugFor('blog-customer-new')))],
    ['blogUpdate', () => customer.cmsBlog.update(ownerCreated.id, blogInput(slugFor('blog-owner')))],
    ['caseCreate', () => customer.cmsCases.create(caseInput(slugFor('case-customer')))],
  ]) {
    try {
      await run();
      customerResults.push(`${label}:allowed`);
    } catch (error) {
      customerResults.push(`${label}:${db.isPermissionDeniedError(error) ? 'denied' : 'error'}`);
    }
  }
  const customerDraftRead = await customer.cmsBlog.getById(ownerCreated.id);
  record(
    11,
    'customer denied write：非後台成員不可寫入官方 CMS，也讀不到未發布內容',
    customerResults.every((item) => item.endsWith(':denied')) && customerDraftRead === null,
    `${customerResults.join(' · ')} draftRead=${customerDraftRead === null ? 'null' : 'visible'}`,
  );

  // 12. slug unique
  let slugConflict = false;
  try {
    await owner.cmsBlog.create(blogInput(slugFor('blog-editor')));
  } catch (error) {
    slugConflict = db.isSlugConflictError(error);
  }
  const dbUnique = psqlJson("select count(*) from pg_constraint where conrelid = 'public.blog_posts'::regclass and contype = 'u'") > 0;
  record(12, 'slug unique：重複 slug 被資料庫拒絕，repository 回報為 slug 衝突', slugConflict && dbUnique, `conflictDetected=${slugConflict} dbUniqueConstraint=${dbUnique}`);

  // 13. sanitize
  const dangerous = '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src=x onerror=alert(1)>\n\n<iframe src="https://evil.test"></iframe>';
  const rendered = markdown.renderMarkdown(dangerous);
  const unsafeHits = markdown.findUnsafeContentPatterns(dangerous);
  const validation = db.validateBlogPostInput(blogInput(slugFor('blog-sanitize'), { content: dangerous }));
  // 輸出只能有白名單標籤；危險內容必須以純文字（escape 後）呈現，而不是真的 HTML
  const renderedTags = [...rendered.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)].map((match) => match[1].toLowerCase());
  const unexpectedTags = [...new Set(renderedTags)].filter((tag) => !markdown.ALLOWED_MARKDOWN_TAGS.includes(tag));
  const renderedAttributes = [...rendered.matchAll(/<[a-z][a-z0-9]*\b([^>]*)>/gi)].map((match) => match[1]);
  const dangerousAttribute = renderedAttributes.some((attributes) => /\son[a-z]+\s*=/i.test(attributes) || /(href|src)\s*=\s*"\s*javascript:/i.test(attributes));
  const renderedSafe = unexpectedTags.length === 0 && !dangerousAttribute && rendered.includes('&lt;script&gt;') && rendered.includes('&lt;iframe');
  const distHtml = read(htmlPath(DIST, '/blog/new-site-seo-first-3-months'));
  const distSafe = distHtml !== '' && !/<script(?![^>]*type="application\/ld\+json")[^>]*>[^<]*alert/i.test(distHtml);
  record(
    13,
    'sanitize：Markdown 輸出只有白名單標籤，危險內容被 escape；後台驗證會擋下含 script / javascript: 的內容',
    renderedSafe && unsafeHits.length >= 3 && !validation.ok && Boolean(validation.errors.content) && distSafe,
    `renderedSafe=${renderedSafe} unexpectedTags=${unexpectedTags.join(',') || 'none'} unsafePatterns=${unsafeHits.length} validationBlocked=${!validation.ok} distSafe=${distSafe}`,
  );

  // 14. audit
  const auditRows = psqlJson(`select json_agg(json_build_object('action', action, 'actor', actor_id, 'type', actor_type, 'entity', entity_type, 'metadata', metadata, 'before', before_data, 'after', after_data) order by id)
    from public.audit_logs where id > ${auditFrom} and action like 'cms.%'`) ?? [];
  const actions = new Set(auditRows.map((row) => row.action));
  const noFullContent = auditRows.every((row) => row.before === null && row.after === null && !JSON.stringify(row.metadata ?? {}).includes('這是驗收內容'));
  record(
    14,
    'audit：cms.blog.* / cms.case.* 寫入 audit_logs，metadata 只有 id / slug / 變更欄位，不含內容全文',
    ['cms.blog.create', 'cms.blog.update', 'cms.blog.publish', 'cms.blog.archive', 'cms.case.create'].every((action) => actions.has(action)) &&
      auditRows.every((row) => row.type === 'admin' && row.actor) &&
      noFullContent,
    `actions=${[...actions].join(', ')} rows=${auditRows.length} noFullContent=${noFullContent}`,
  );
} catch (error) {
  record(7, 'Supabase 模式角色權限測試', false, error.message);
} finally {
  cleanupContent();
  if (accounts) {
    try {
      await cleanupTestAccounts(env);
    } catch (error) {
      console.error(`[cms:verify] 測試帳號清除失敗：${error.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 15–24. 靜態 build 輸出
// ---------------------------------------------------------------------------
{
  const blogIndex = read(htmlPath(DIST, '/blog'));
  const blogDetail = read(htmlPath(DIST, '/blog/new-site-seo-first-3-months'));
  const casesIndex = read(htmlPath(DIST, '/cases'));
  const caseDetail = read(htmlPath(DIST, '/cases/hungjui-brand-site'));

  const cards = (blogIndex.match(/<article\b[^>]*data-blog-card/g) ?? []).length;
  record(
    15,
    'Blog list route：/blog 由 repository 驅動，卡片連到文章頁',
    blogIndex !== '' && cards >= 3 && /href="\/blog\/new-site-seo-first-3-months"/.test(blogIndex),
    `cards=${cards}`,
  );
  record(
    16,
    'Blog detail route：/blog/[slug] 有標題、發布日期、分類、內文與相關文章',
    blogDetail !== '' &&
      blogDetail.includes('新網站怎麼開始做 SEO') &&
      /<time datetime="\d{4}-\d{2}-\d{2}"/.test(blogDetail) &&
      /class="[^"]*syt-prose/.test(blogDetail) &&
      blogDetail.includes('相關文章'),
    `length=${blogDetail.length}`,
  );

  const caseCards = (casesIndex.match(/data-filter-item/g) ?? []).length;
  record(
    17,
    'Cases list：/cases 由 repository 驅動，卡片連到案例頁',
    casesIndex !== '' && caseCards >= 8 && /href="\/cases\/hungjui-brand-site"/.test(casesIndex),
    `cards=${caseCards}`,
  );
  record(
    18,
    'Case detail：/cases/[slug] 有產業、服務類型、問題、做法、成果說明與相關案例',
    caseDetail !== '' &&
      caseDetail.includes('Hungjui 形象官網') &&
      caseDetail.includes('面對的問題') &&
      caseDetail.includes('做法') &&
      caseDetail.includes('成效數據取得客戶同意') &&
      caseDetail.includes('相關案例'),
    `length=${caseDetail.length}`,
  );

  const notBuilt = (route) => !existsSync(htmlPath(DIST, route));
  record(19, 'Draft 不進 build：草稿文章與草稿案例沒有輸出頁面', notBuilt('/blog/launch-checklist') && notBuilt('/cases/sample-clinic-site'), '/blog/launch-checklist · /cases/sample-clinic-site');
  record(20, 'scheduled future 不進 build：排程時間未到的文章沒有輸出頁面', notBuilt('/blog/faq-schema-guide'), '/blog/faq-schema-guide');
  record(21, 'archived 不進 build：已下架文章沒有輸出頁面', notBuilt('/blog/redeem-access-code'), '/blog/redeem-access-code');

  const sitemap = read(path.join(DIST, 'sitemap.xml'));
  const metaProblems = [];
  for (const [route, html] of [
    ['/blog/new-site-seo-first-3-months', blogDetail],
    ['/cases/hungjui-brand-site', caseDetail],
  ]) {
    if (!titleOf(html).includes('森映')) metaProblems.push(`${route} title`);
    if (!(metaContent(html, 'name', 'description') ?? '').trim()) metaProblems.push(`${route} description`);
    if (!html.includes(`<link rel="canonical" href="http://localhost:4321${route}">`)) metaProblems.push(`${route} canonical`);
    if (!(metaContent(html, 'property', 'og:image') ?? '').startsWith('http')) metaProblems.push(`${route} og:image`);
    if (!(metaContent(html, 'name', 'robots') ?? '').includes('noindex')) metaProblems.push(`${route} robots（本機 build 應為 noindex）`);
    if (!sitemap.includes(`<loc>http://localhost:4321${route}</loc>`)) metaProblems.push(`${route} 未收錄於 sitemap`);
  }
  record(22, 'metadata：內容頁的 title / description / canonical / og:image / robots 與 sitemap 收錄', metaProblems.length === 0, metaProblems.join(' | ') || 'ok');

  const breadcrumbProblems = [];
  for (const [route, html, label] of [
    ['/blog/new-site-seo-first-3-months', blogDetail, '部落格'],
    ['/cases/hungjui-brand-site', caseDetail, '案例作品'],
  ]) {
    const block = jsonLdOfType(html, 'BreadcrumbList')[0];
    const items = block?.itemListElement ?? [];
    if (items.length !== 3) breadcrumbProblems.push(`${route} BreadcrumbList ${items.length} items`);
    if (items[1]?.name !== label) breadcrumbProblems.push(`${route} 第 2 層為 ${items[1]?.name}`);
    if (!/<nav[^>]*aria-label="麵包屑"/.test(html)) breadcrumbProblems.push(`${route} 沒有可見麵包屑`);
  }
  record(23, 'Breadcrumb：內容頁有可見麵包屑與 BreadcrumbList JSON-LD（首頁 → 列表 → 內容）', breadcrumbProblems.length === 0, breadcrumbProblems.join(' | ') || 'ok');

  const article = jsonLdOfType(blogDetail, 'Article')[0];
  const creativeWork = jsonLdOfType(caseDetail, 'CreativeWork')[0];
  const noFakeReview = !/"@type"\s*:\s*"(Review|AggregateRating)"/.test(blogDetail + caseDetail);
  record(
    24,
    'JSON-LD：文章頁輸出 Article、案例頁輸出 CreativeWork，且不宣稱 Review / Rating',
    Boolean(article?.headline) && Boolean(article?.datePublished) && Boolean(creativeWork?.name) && creativeWork?.inLanguage === 'zh-TW' && noFakeReview,
    `article=${article?.headline ?? 'none'} creativeWork=${creativeWork?.name ?? 'none'} noFakeReview=${noFakeReview}`,
  );
}

// ---------------------------------------------------------------------------
// 25–26. 搜尋索引
// ---------------------------------------------------------------------------
{
  const file = path.join(DIST, 'search-index.json');
  const raw = read(file);
  let index = { entries: [] };
  try {
    index = JSON.parse(raw);
  } catch {
    index = { entries: [] };
  }
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const types = new Set(entries.map((entry) => entry.type));
  record(
    25,
    'Search index：/search-index.json 存在，收錄文章 / 案例 / 產品 / 主要頁面',
    entries.length > 0 && ['blog', 'case', 'product', 'page'].every((type) => types.has(type)) && entries.every((entry) => entry.title && entry.url.startsWith('/')),
    `entries=${entries.length} types=${[...types].join(',')}`,
  );

  const forbidden = entries.filter((entry) => /^\/(admin|portal|checkout|api)(\/|$)/.test(entry.url));
  const unpublished = entries.filter((entry) => ['/blog/launch-checklist', '/blog/faq-schema-guide', '/blog/redeem-access-code', '/cases/sample-clinic-site'].includes(entry.url));
  record(
    26,
    'Search 不含 private content：沒有 /admin、/portal、/checkout，也沒有草稿 / 排程 / 已下架內容',
    forbidden.length === 0 && unpublished.length === 0,
    forbidden.concat(unpublished).map((entry) => entry.url).join(', ') || 'clean',
  );
}

// ---------------------------------------------------------------------------
// 27–30. Admin（DATA_SOURCE=supabase）
// ---------------------------------------------------------------------------
if (args.has('--skip-admin')) {
  for (const [no, name] of [
    [27, 'Dashboard Supabase mode 不 crash'],
    [28, 'CMS navigation 可進'],
    [29, 'CMS pages 可進'],
    [30, 'CMS SEO 可進'],
  ]) {
    record(no, `${name}（--skip-admin，未執行）`, true, 'skipped');
  }
} else {
  let adminAccounts;
  try {
    adminAccounts = await ensureTestAccounts(env);
    // admin 只拿到 anon key：證明讀寫都走使用者 session + RLS
    const server = await startAdminServer({ env: { ...appEnv(env), SUPABASE_SERVICE_ROLE_KEY: '' } });
    servers.push(server);
    browser = await chromium.launch({ executablePath: findChrome(), headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(`${server.url}/admin/login?next=${encodeURIComponent('/admin/dashboard')}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', adminAccounts.owner.email);
    await page.fill('input[name="password"]', adminAccounts.owner.password);
    await Promise.all([page.waitForURL((url) => !url.pathname.endsWith('/login') || url.searchParams.has('error'), { timeout: 60000 }), page.locator('form button[type="submit"]').first().click()]);
    await page.waitForLoadState('networkidle');

    const visit = async (route) => {
      // networkidle 在 Next.js 的 RSC prefetch 下不一定會穩定，改以 domcontentloaded + load 判斷
      const response = await page.goto(`${server.url}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('load');
      // Next.js 會先送出 shell（含 loading.tsx），主要內容稍後 stream 進來：等 <main> 真的有內容再讀
      await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').replace(/\s+/g, '').length > 40, undefined, { timeout: 60000 });
      return {
        status: response?.status() ?? 0,
        path: new URL(page.url()).pathname,
        text: (await page.locator('main').innerText()).replace(/\s+/g, ' '),
        shell: await page.locator('[data-sidebar]').count(),
        unavailable: await page.locator('[data-module-unavailable]').count(),
      };
    };

    const dashboard = await visit('/admin/dashboard');
    // 已接線的模組必須顯示真實統計（不可因為某個 widget 失敗就整頁 unavailable，也不可用假數字）
    const dbCounts = psqlJson("select json_build_object('posts', (select count(*) from public.blog_posts where status='published'), 'cases', (select count(*) from public.case_studies where status='published'))");
    const contentSection = await page.locator('section[aria-labelledby="content-heading"]').innerText().catch(() => '');
    const contentNumbers = contentSection.replace(/\s+/g, ' ');
    const contentOk =
      contentNumbers.includes(`已發布文章 ${dbCounts.posts}`) && contentNumbers.includes(`已發布案例 ${dbCounts.cases}`) && !contentNumbers.includes('尚未啟用');
    record(
      27,
      'Dashboard Supabase mode 不 crash：HTTP 200、側欄可操作、CMS 統計為真實數字、未接線模組顯示「尚未啟用」',
      dashboard.status === 200 &&
        dashboard.path === '/admin/dashboard' &&
        dashboard.shell > 0 &&
        dashboard.unavailable >= 1 &&
        contentOk &&
        dashboard.text.includes('尚未啟用') &&
        !dashboard.text.includes('畫面載入失敗') &&
        consoleErrors.length === 0,
      `status=${dashboard.status} cmsCounts=${dbCounts.posts}/${dbCounts.cases} contentOk=${contentOk} unavailableWidgets=${dashboard.unavailable} pageErrors=${consoleErrors.length}`,
    );

    const navigation = await visit('/admin/cms/navigation');
    record(
      28,
      'CMS navigation 可進：列出 Header / Footer 選單項目且可編輯 label / 連結 / 排序 / 啟用',
      navigation.status === 200 && navigation.path === '/admin/cms/navigation' && (await page.locator('[data-nav-item]').count()) >= 5 && navigation.text.includes('主選單'),
      `status=${navigation.status} path=${navigation.path} items=${await page.locator('[data-nav-item]').count()}`,
    );

    const pages = await visit('/admin/cms/pages');
    record(
      29,
      'CMS pages 可進：列出官網固定頁的 route、SEO 來源與索引狀態',
      pages.status === 200 && pages.path === '/admin/cms/pages' && pages.text.includes('/products/seo-website') && pages.text.includes('noindex') && pages.text.includes('首頁'),
      `status=${pages.status} path=${pages.path}`,
    );

    const seo = await visit('/admin/cms/seo');
    record(
      30,
      'CMS SEO 可進：固定頁索引狀態 + 文章 / 案例的 SEO 覆寫狀況',
      seo.status === 200 && seo.path === '/admin/cms/seo' && seo.text.includes('固定頁') && seo.text.includes('/blog/') && seo.text.includes('/cases/'),
      `status=${seo.status} path=${seo.path}`,
    );

    await context.close();
  } catch (error) {
    record(27, 'Admin（DATA_SOURCE=supabase）驗收', false, error.message);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await stopAll(servers);
    if (adminAccounts) {
      try {
        await cleanupTestAccounts(env);
      } catch (error) {
        console.error(`[cms:verify] 測試帳號清除失敗：${error.message}`);
      }
    }
  }
}

const leftovers = psqlJson(`select count(*) from public.blog_posts where slug like '${PREFIX}-%'`) + psqlJson(`select count(*) from public.case_studies where slug like '${PREFIX}-%'`);
const remainingAccounts = psqlJson(`select count(*) from auth.users where email like 'phase28.%@syt-local.test'`);
if (Number(leftovers) !== 0 || Number(remainingAccounts) !== 0) {
  console.error(`[cms:verify] 清理未完成：content=${leftovers} accounts=${remainingAccounts}`);
}

report.finish('cms:verify');
