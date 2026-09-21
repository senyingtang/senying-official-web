// Phase 2.9 CMS 真實整合驗收（Admin repository ↔ 本機 Supabase ↔ Marketing static build）
//
// 流程（Blog 與 Case 各一輪，全部在 finally 清除）：
//   建立草稿 → public 讀不到 → 發布 → public 讀得到 → Marketing build → 內容頁存在 + 搜尋索引含該頁
//   → 下架 → 重新 build → 內容頁消失、搜尋索引不再包含 → 清除測試資料
// 另外驗證 rebuild 狀態流程（內容更新後為「需要重新建置」，標記完成後回到「已同步」）。
//
// 只連本專案 local Supabase（API 54421 / DB 54422），build 輸出到 .phase29-report/supabase-dist，
// 不覆蓋 apps/marketing/dist（phase29 其他驗收仍以預設 mock build 為證據）。
//
// 用法：pnpm cms-integration:verify
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { supabaseBuildEnv } from './lib/build-env.mjs';
import { cleanupTestAccounts, ensureTestAccounts } from './lib/local-fixtures.mjs';
import { loadDatabaseBundle } from './lib/database-bundle.mjs';
import { appEnv, getLocalSupabaseEnv, maskSecret, psql, psqlJson, sqlLiteral } from './lib/local-supabase.mjs';
import { MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { createReport, htmlPath, read, rel } from './lib/static-site.mjs';

const report = createReport('Phase 2.9 CMS integration（Admin ↔ 本機 Supabase ↔ Marketing build）');
const { record } = report;
const REPORT_DIR = path.join(ROOT, '.phase29-report');
const SUPABASE_DIST = path.join(REPORT_DIR, 'supabase-dist');
const require = createRequire(path.join(ROOT, 'packages', 'database', 'package.json'));
const { createClient } = require('@supabase/supabase-js');

const BLOG_SLUG = 'cms-integration-blog';
const CASE_SLUG = 'cms-integration-case';
const seo = { seoTitle: '', seoDescription: '', ogImageUrl: '', canonicalOverride: '' };

const cleanup = () => {
  const slugs = `${sqlLiteral(BLOG_SLUG)}, ${sqlLiteral(CASE_SLUG)}`;
  psql(`begin;
    delete from public.seo_metadata where entity_id in (select id from public.blog_posts where slug in (${slugs}));
    delete from public.seo_metadata where entity_id in (select id from public.case_studies where slug in (${slugs}));
    delete from public.blog_posts where slug in (${slugs});
    delete from public.case_studies where slug in (${slugs});
    delete from public.marketing_rebuild_requests where reason like '%整合驗收%';
  commit;`);
  // audit_logs 為 append-only（0012 trigger）：驗收自己產生的紀錄以 replica 模式清除，本機 DB 才能重複執行
  psql(`begin;
    set local session_replication_role = replica;
    delete from public.audit_logs where action like 'cms.%' and metadata ->> 'slug' in (${slugs});
  commit;`);
};

let env;
try {
  env = getLocalSupabaseEnv();
  record(1, '本機 Supabase 可連線（只允許本專案 local stack）', true, `API ${env.apiUrl} · anon ${maskSecret(env.anonKey)}`);
} catch (error) {
  record(1, '本機 Supabase 可連線', false, error.message);
  report.finish('cms-integration:verify');
}

function buildMarketing(label) {
  const childEnv = supabaseBuildEnv(appEnv(env), { ASTRO_OUT_DIR: path.relative(MARKETING_DIR, SUPABASE_DIST).split(path.sep).join('/') });
  rmSync(SUPABASE_DIST, { recursive: true, force: true });
  console.log(`\n[cms-integration] $ pnpm --filter @syt/marketing build  (${label} → ${rel(SUPABASE_DIST)})`);
  const result = spawnSync('pnpm --filter @syt/marketing build', { cwd: ROOT, shell: true, stdio: 'inherit', env: childEnv });
  return result.status === 0 && existsSync(path.join(SUPABASE_DIST, 'index.html'));
}

const searchIndexUrls = () => {
  try {
    return (JSON.parse(read(path.join(SUPABASE_DIST, 'search-index.json'))).entries ?? []).map((entry) => entry.url);
  } catch {
    return [];
  }
};
const pageExists = (route) => existsSync(htmlPath(SUPABASE_DIST, route));

const db = await loadDatabaseBundle(REPORT_DIR);
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
let accounts;

try {
  cleanup();
  accounts = await ensureTestAccounts(env);

  const anonRepos = db.createSupabaseRepositories(createClient(env.apiUrl, env.anonKey, clientOptions));
  const ownerClient = createClient(env.apiUrl, env.anonKey, clientOptions);
  const signIn = await ownerClient.auth.signInWithPassword({ email: accounts.owner.email, password: accounts.owner.password });
  if (signIn.error) throw new Error('owner 登入失敗');
  const owner = db.createSupabaseRepositories(ownerClient, {
    viewer: { userId: accounts.owner.id, email: accounts.owner.email, scope: 'admin', adminRole: 'owner', workspaceIds: [] },
  });

  // -------------------------------------------------------------------------
  // 2–3. 建立草稿 → public 讀不到
  // -------------------------------------------------------------------------
  const blogDraft = await owner.cmsBlog.create({
    slug: BLOG_SLUG,
    title: 'CMS 整合驗收文章',
    excerpt: '整合驗收用文章，流程結束後會刪除。',
    content: '## 整合驗收\n\n這一篇用來確認「後台儲存 → 重新建置 → 官網出現」的流程。',
    status: 'draft',
    categorySlug: 'seo',
    coverImageUrl: '',
    authorName: '整合驗收',
    isFeatured: false,
    publishedAt: null,
    scheduledAt: null,
    seo: { ...seo, seoTitle: 'CMS 整合驗收文章', seoDescription: '整合驗收用文章描述。' },
  });
  const caseDraft = await owner.cmsCases.create({
    slug: CASE_SLUG,
    title: 'CMS 整合驗收案例',
    excerpt: '整合驗收用案例，流程結束後會刪除。',
    content: '## 整合驗收\n\n這一個案例用來確認案例內容頁的建置流程。',
    industry: '品牌形象',
    serviceType: 'SEO 形象官網',
    coverImageUrl: '',
    clientLabel: '版型示意',
    isSample: true,
    displayStatus: '版型示意',
    gallery: [],
    status: 'draft',
    isFeatured: false,
    sortOrder: 950,
    challenge: '整合驗收：面對的問題。',
    solution: '整合驗收：做法。',
    resultSummary: '',
    publishedAt: null,
    seo: { ...seo },
  });
  record(
    2,
    'owner 以 repository 建立 Blog 與 Case 草稿（真實登入 + RLS，寫入本機 Supabase）',
    blogDraft.persisted && caseDraft.persisted,
    `blog=${blogDraft.id.slice(0, 8)} case=${caseDraft.id.slice(0, 8)}`,
  );

  const draftPublicBlog = await anonRepos.cmsBlog.getPublishedBySlug(BLOG_SLUG);
  const draftPublicCase = await anonRepos.cmsCases.getPublishedBySlug(CASE_SLUG);
  record(3, '草稿階段：public（anon）讀不到文章與案例', draftPublicBlog === null && draftPublicCase === null, `blog=${draftPublicBlog} case=${draftPublicCase}`);

  // -------------------------------------------------------------------------
  // 4. rebuild 狀態：內容更新後為「需要重新建置」
  // -------------------------------------------------------------------------
  await owner.marketingRebuild.trigger('整合驗收：內容已更新');
  const pendingStatus = await owner.marketingRebuild.getStatus();
  record(
    4,
    'Rebuild 狀態：內容更新後顯示「需要重新建置」，並記錄最後內容更新時間',
    pendingStatus.persisted && pendingStatus.state === 'rebuild_required' && Boolean(pendingStatus.lastContentUpdatedAt),
    `state=${pendingStatus.state} lastContentUpdatedAt=${pendingStatus.lastContentUpdatedAt}`,
  );

  // -------------------------------------------------------------------------
  // 5–7. 發布 → public 讀得到 → build → 內容頁與搜尋索引
  // -------------------------------------------------------------------------
  await owner.cmsBlog.publish(blogDraft.id);
  await owner.cmsCases.publish(caseDraft.id);
  const publishedBlog = await anonRepos.cmsBlog.getPublishedBySlug(BLOG_SLUG);
  const publishedCase = await anonRepos.cmsCases.getPublishedBySlug(CASE_SLUG);
  record(
    5,
    '發布後：public（anon）讀得到文章與案例，且內容與後台一致',
    publishedBlog?.title === 'CMS 整合驗收文章' && publishedCase?.title === 'CMS 整合驗收案例' && publishedBlog?.seo.seoTitle === 'CMS 整合驗收文章',
    `blog=${publishedBlog?.title} case=${publishedCase?.title}`,
  );

  const builtAfterPublish = buildMarketing('發布後');
  const blogRoute = `/blog/${BLOG_SLUG}`;
  const caseRoute = `/cases/${CASE_SLUG}`;
  const blogHtml = read(htmlPath(SUPABASE_DIST, blogRoute));
  const caseHtml = read(htmlPath(SUPABASE_DIST, caseRoute));
  record(
    6,
    'Marketing build（DATA_SOURCE=supabase + anon key）：內容頁存在且顯示後台輸入的內容',
    builtAfterPublish &&
      blogHtml.includes('CMS 整合驗收文章') &&
      blogHtml.includes('這一篇用來確認') &&
      caseHtml.includes('CMS 整合驗收案例') &&
      caseHtml.includes('整合驗收：面對的問題。') &&
      caseHtml.includes('非客戶專案'),
    `${blogRoute}=${blogHtml.length} ${caseRoute}=${caseHtml.length}`,
  );

  const urlsAfterPublish = searchIndexUrls();
  const listHasBlog = read(htmlPath(SUPABASE_DIST, '/blog')).includes(`href="${blogRoute}"`);
  const listHasCase = read(htmlPath(SUPABASE_DIST, '/cases')).includes(`href="${caseRoute}"`);
  record(
    7,
    '搜尋索引與列表頁包含新發布的內容',
    urlsAfterPublish.includes(blogRoute) && urlsAfterPublish.includes(caseRoute) && listHasBlog && listHasCase,
    `indexUrls=${urlsAfterPublish.length} blogInList=${listHasBlog} caseInList=${listHasCase}`,
  );

  // -------------------------------------------------------------------------
  // 8. rebuild 狀態：標記完成後回到「已同步」
  // -------------------------------------------------------------------------
  psql(`update public.marketing_rebuild_requests set status = 'synced', completed_at = now() where status in ('pending', 'building');`);
  const syncedStatus = await owner.marketingRebuild.getStatus();
  record(
    8,
    'Rebuild 狀態：建置完成後回到「已同步」，並記錄最後建置時間',
    syncedStatus.state === 'synced' && Boolean(syncedStatus.lastMarketingBuildAt),
    `state=${syncedStatus.state} lastMarketingBuildAt=${syncedStatus.lastMarketingBuildAt}`,
  );

  // -------------------------------------------------------------------------
  // 9–11. 下架 → 重新 build → 內容頁消失
  // -------------------------------------------------------------------------
  await owner.cmsBlog.archive(blogDraft.id);
  await owner.cmsCases.archive(caseDraft.id);
  const archivedBlog = await anonRepos.cmsBlog.getPublishedBySlug(BLOG_SLUG);
  const archivedCase = await anonRepos.cmsCases.getPublishedBySlug(CASE_SLUG);
  record(9, '下架後：public（anon）讀不到文章與案例', archivedBlog === null && archivedCase === null, `blog=${archivedBlog} case=${archivedCase}`);

  const staleBlogPage = pageExists(blogRoute);
  record(10, '靜態網站特性：下架後尚未重新建置前，舊頁面仍在既有 build 中（必須重新建置才會消失）', staleBlogPage, `舊 build 仍有 ${blogRoute}=${staleBlogPage}`);

  const builtAfterArchive = buildMarketing('下架後');
  const urlsAfterArchive = searchIndexUrls();
  record(
    11,
    '重新建置後：內容頁消失、列表與搜尋索引不再包含',
    builtAfterArchive &&
      !pageExists(blogRoute) &&
      !pageExists(caseRoute) &&
      !urlsAfterArchive.includes(blogRoute) &&
      !urlsAfterArchive.includes(caseRoute) &&
      !read(htmlPath(SUPABASE_DIST, '/blog')).includes(`href="${blogRoute}"`) &&
      !read(htmlPath(SUPABASE_DIST, '/cases')).includes(`href="${caseRoute}"`),
    `blogPage=${pageExists(blogRoute)} casePage=${pageExists(caseRoute)} indexUrls=${urlsAfterArchive.length}`,
  );
} catch (error) {
  record(2, 'CMS 整合流程', false, error.message);
} finally {
  cleanup();
  rmSync(SUPABASE_DIST, { recursive: true, force: true });
  let removed = 'cleanup failed';
  if (accounts) {
    try {
      removed = `${await cleanupTestAccounts(env)} 個測試帳號已刪除`;
    } catch (error) {
      removed = error.message;
    }
  } else {
    removed = '未建立測試帳號';
  }
  const leftovers = Number(psqlJson(`select count(*) from public.blog_posts where slug in (${sqlLiteral(BLOG_SLUG)}, ${sqlLiteral(CASE_SLUG)})`)) +
    Number(psqlJson(`select count(*) from public.case_studies where slug in (${sqlLiteral(BLOG_SLUG)}, ${sqlLiteral(CASE_SLUG)})`));
  const rebuildLeftovers = Number(psqlJson(`select count(*) from public.marketing_rebuild_requests where reason like '%整合驗收%'`));
  const baseline = psqlJson("select json_build_object('posts', (select count(*) from public.blog_posts), 'cases', (select count(*) from public.case_studies))");
  record(
    12,
    '清理：測試內容、重建請求與測試帳號全部移除，DB 回到原本的 seed 內容',
    leftovers === 0 && rebuildLeftovers === 0 && /已刪除/.test(removed) && baseline.posts === 3 && baseline.cases === 8,
    `content=${leftovers} rebuildRequests=${rebuildLeftovers} · ${removed} · posts=${baseline.posts} cases=${baseline.cases}`,
  );
}

report.finish('cms-integration:verify');
