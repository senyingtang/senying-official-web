// Phase 2.8 Site Settings 真實整合驗收（Admin ↔ 本機 Supabase ↔ Marketing static build）
//
// 只連本專案 local Supabase（API 54421 / DB 54422）。測試資料一定還原：try / finally 以 repository rollback，失敗時再以 postgres 還原。
//
//   A. Admin（DATA_SOURCE=supabase，next start，不提供 service role）
//      1. 本機 Supabase reachable            2. 記錄原始設定
//      3. owner 登入 /admin/cms/site-settings 載入 DB 內容
//      4. owner 在表單修改 英文品牌 SEN YING TEST / Instagram 測試網址 / 預設收合，儲存
//      5. 直接查 DB：值更新、updated_at 變更、updated_by、只改目標列、沒有重複列、JSON 有效、audit_logs
//      6. editor / viewer 唯讀（fieldset disabled）、author 被路由擋下、customer 不是後台成員
//      7. 以 owner server-side repository 還原原始設定
//   B. Round trip（server-side repository → DB → Astro build → dist → rollback）
//      8. repository 更新測試值（owner session，RLS）  9. 查 DB
//     10. editor / viewer / author / customer 以 repository 寫入 → 權限錯誤、DB 不變
//     11. Marketing build（DATA_SOURCE=supabase + anon key，輸出到 .phase28-report/supabase-dist，不覆蓋 apps/marketing/dist）
//     12. dist：Header / Footer / title / JSON-LD / og:site_name / Floating Actions / sameAs / logo / favicon 使用 DB 值，無 service role
//     13. rollback 成原始值（finally）          14. 查 DB 確認還原
//     15. 重新 build，dist 回到 SEN YING、沒有測試網址（static build：修改後需 rebuild 才反映）
//
// 用法：pnpm site-settings:verify [--skip-admin-build] [--skip-ui]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { supabaseBuildEnv } from './lib/build-env.mjs';
import { cleanupTestAccounts, ensureTestAccounts } from './lib/local-fixtures.mjs';
import { appEnv, getLocalSupabaseEnv, maskSecret, psql, psqlJson, sqlLiteral } from './lib/local-supabase.mjs';
import { ADMIN_DIR, MARKETING_DIR, ROOT, findChrome, installSignalCleanup, startAdminServer, stopAll } from './lib/servers.mjs';
import { createReport, jsonLdOfType, metaContent, read, regionHtml, rel, titleOf, walk } from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.8 Site Settings integration（Admin ↔ 本機 Supabase ↔ Marketing build）');
const { record } = report;
const REPORT_DIR = path.join(ROOT, '.phase28-report');
const SUPABASE_DIST = path.join(REPORT_DIR, 'supabase-dist');
const KEYS = ['site.brand', 'site.socials', 'site.floating_actions'];
const TEST = { brandNameEn: 'SEN YING TEST', instagram: 'https://example.test/sen-ying-instagram' };
const require = createRequire(path.join(ROOT, 'packages', 'database', 'package.json'));
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const snapshot = () =>
  psqlJson(`select json_agg(json_build_object('k', setting_key, 'v', setting_value, 'p', is_public, 'u', updated_at, 'by', updated_by) order by setting_key) from public.cms_site_settings`) ?? [];
const content = (rows) => JSON.stringify(rows.map((row) => ({ k: row.k, v: row.v, p: row.p })));
const byKey = (rows, key) => rows.find((row) => row.k === key);
const auditMaxId = () => Number(psqlJson('select coalesce(max(id), 0) from public.audit_logs'));
function forceRestore(rows) {
  const statements = rows.map((row) => `update public.cms_site_settings set setting_value = ${sqlLiteral(JSON.stringify(row.v))}::jsonb, is_public = ${row.p}, updated_at = ${sqlLiteral(row.u)}::timestamptz, updated_by = ${row.by ? `${sqlLiteral(row.by)}::uuid` : 'null'} where setting_key = ${sqlLiteral(row.k)};`);
  const extras = snapshot().filter((row) => !rows.some((item) => item.k === row.k)).map((row) => `delete from public.cms_site_settings where setting_key = ${sqlLiteral(row.k)};`);
  return psql(`begin;\nset local session_replication_role = replica;\n${[...statements, ...extras].join('\n')}\ncommit;`);
}

/** 以 esbuild 打包真實的 @syt/database（含 Supabase repository），讓 Node 驗收直接使用與 admin 相同的程式碼 */
async function loadDatabaseBundle() {
  const astroPackage = createRequire(path.join(MARKETING_DIR, 'package.json')).resolve('astro/package.json');
  const vitePackage = createRequire(astroPackage).resolve('vite/package.json');
  const esbuild = createRequire(vitePackage)('esbuild');
  mkdirSync(REPORT_DIR, { recursive: true });
  const outfile = path.join(REPORT_DIR, 'database-bundle.mjs');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'packages', 'database', 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    external: ['@supabase/supabase-js'],
    banner: { js: `import { createRequire as __cr } from 'node:module'; const require = __cr(${JSON.stringify(path.join(ROOT, 'packages', 'database', 'package.json'))});` },
  });
  // external 的 @supabase/supabase-js 需要從 packages/database 解析
  const { readFileSync, writeFileSync } = await import('node:fs');
  const supabaseEntry = pathToFileURL(require.resolve('@supabase/supabase-js')).href;
  writeFileSync(outfile, readFileSync(outfile, 'utf8').replaceAll(/from ["']@supabase\/supabase-js["']/g, `from ${JSON.stringify(supabaseEntry)}`));
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function buildMarketing(env) {
  const childEnv = supabaseBuildEnv(appEnv(env), { ASTRO_OUT_DIR: path.relative(MARKETING_DIR, SUPABASE_DIST).split(path.sep).join('/'), SITE_SETTINGS_MOCK_PRESET: '' });
  rmSync(SUPABASE_DIST, { recursive: true, force: true });
  console.log(`\n[site-settings] $ pnpm --filter @syt/marketing build  (DATA_SOURCE=supabase PUBLIC_SUPABASE_URL=${env.apiUrl} anon=${maskSecret(env.anonKey)} → ${rel(SUPABASE_DIST)})`);
  const result = spawnSync('pnpm --filter @syt/marketing build', { cwd: ROOT, shell: true, stdio: 'inherit', env: childEnv });
  return result.status === 0 && existsSync(path.join(SUPABASE_DIST, 'index.html'));
}

function distValues() {
  const home = read(path.join(SUPABASE_DIST, 'index.html'));
  const header = regionHtml(home, 'header', 'data-section="header"');
  const footer = regionHtml(home, 'footer', 'data-section="footer"');
  const floating = home.match(/<div\b[^>]*data-floating-actions[\s\S]*$/)?.[0]?.split('</body>')[0] ?? '';
  const organization = jsonLdOfType(home, 'Organization')[0] ?? {};
  const favicon = (home.match(/<link\b[^>]*data-brand-favicon[^>]*>/)?.[0] ?? '').match(/\shref="([^"]*)"/)?.[1] ?? '';
  const htmlFiles = walk(SUPABASE_DIST).filter((file) => /\.(html|js|css|json|xml|txt)$/.test(file));
  return {
    home,
    headerEn: header.match(/data-brand-en[^>]*>([^<]*)</)?.[1] ?? '',
    footerEn: footer.match(/data-brand-en[^>]*>([^<]*)</)?.[1] ?? '',
    footerCopyright: footer.match(/©\s*\d{4}\s*([^.<]*)\./)?.[1]?.trim() ?? '',
    title: titleOf(home),
    siteName: metaContent(home, 'property', 'og:site_name'),
    organizationName: organization.name,
    sameAs: organization.sameAs ?? [],
    instagramInRail: new RegExp(`data-social="instagram"[^>]*href="${TEST.instagram.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"|href="${TEST.instagram.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"[^>]*data-social="instagram"`).test(floating),
    defaultCollapsed: floating.match(/data-default-collapsed="(true|false)"/)?.[1] ?? '',
    logoSource: header.match(/data-brand-logo-source="([^"]+)"/)?.[1] ?? '',
    markUse: /<use href="\/brand\/sen-ying-mark\.svg#sen-ying-mark"/.test(header),
    favicon,
    files: htmlFiles,
    anyTestUrl: htmlFiles.some((file) => read(file).includes('example.test')),
  };
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
let env;
try {
  env = getLocalSupabaseEnv();
  record(1, '本機 Supabase reachable（只允許本專案 local stack）', true, `API ${env.apiUrl} · Studio ${env.studioUrl}`);
} catch (error) {
  record(1, '本機 Supabase reachable', false, error.message);
  report.finish('site-settings:verify');
}

const original = snapshot();
const originalBrand = byKey(original, 'site.brand')?.v ?? {};
record(2, '記錄原始設定（三個官網設定 + 全表內容）', KEYS.every((key) => byKey(original, key)) && originalBrand.name_en === 'SEN YING', `brand.name_en=${originalBrand.name_en} · ${original.length} rows`);
const marketingDistMtime = existsSync(path.join(MARKETING_DIR, 'dist', 'index.html')) ? statSync(path.join(MARKETING_DIR, 'dist', 'index.html')).mtimeMs : null;

const db = await loadDatabaseBundle();
const auditStart = auditMaxId();
const accounts = await ensureTestAccounts(env);
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const clients = [];
async function repoFor(role) {
  const client = createClient(env.apiUrl, env.anonKey, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email: accounts[role].email, password: accounts[role].password });
  if (error) throw new Error(`${role} 登入失敗`);
  clients.push(client);
  const adminRole = role === 'customer' ? null : role;
  return db.createSupabaseRepositories(client, { viewer: { userId: accounts[role].id, email: accounts[role].email, scope: 'admin', adminRole, workspaceIds: [] } });
}
const ownerRepo = await repoFor('owner');
const originalSettings = await ownerRepo.siteSettings.getMarketingSiteSettings();
const withTestValues = (settings) => ({
  ...settings,
  brand: { ...settings.brand, brandNameEn: TEST.brandNameEn },
  socials: settings.socials.map((item) => (item.platform === 'instagram' ? { ...item, url: TEST.instagram, enabled: true } : item)),
  floatingActions: { ...settings.floatingActions, defaultCollapsed: !settings.floatingActions.defaultCollapsed },
});

/** DB 是否已套用測試值（回傳問題清單） */
function testValueProblems(before, after, { actorId, auditFrom }) {
  const problems = [];
  const brand = byKey(after, 'site.brand')?.v ?? {};
  const instagram = (byKey(after, 'site.socials')?.v?.items ?? []).find((item) => item.platform === 'instagram');
  const floating = byKey(after, 'site.floating_actions')?.v ?? {};
  if (brand.name_en !== TEST.brandNameEn || brand.name !== `森映 ${TEST.brandNameEn}`) problems.push(`brand ${brand.name_en} / ${brand.name}`);
  if (brand.tagline !== originalBrand.tagline) problems.push('既有 tagline 被覆蓋');
  if (instagram?.url !== TEST.instagram || instagram?.enabled !== true) problems.push(`instagram ${instagram?.url}`);
  if (floating.default_collapsed !== !byKey(original, 'site.floating_actions').v.default_collapsed) problems.push('default_collapsed 未切換');
  for (const key of KEYS) {
    if (byKey(after, key).u === byKey(before, key).u) problems.push(`${key} updated_at 未變更`);
    if (byKey(after, key).by !== actorId) problems.push(`${key} updated_by=${byKey(after, key).by}`);
  }
  const others = after.filter((row) => !KEYS.includes(row.k));
  if (others.some((row) => JSON.stringify(row) !== JSON.stringify(byKey(before, row.k)))) problems.push('非目標設定列被修改');
  if (after.length !== before.length || new Set(after.map((row) => row.k)).size !== after.length) problems.push('設定列數變更或重複');
  const parsed = db.siteSettingsFromRows(after.filter((row) => KEYS.includes(row.k)).map((row) => ({ setting_key: row.k, setting_value: row.v })));
  if (!db.validateMarketingSiteSettings(parsed).ok) problems.push('JSON 未通過 validateMarketingSiteSettings');
  const audit = psqlJson(`select json_agg(json_build_object('action', action, 'actor', actor_id, 'type', actor_type, 'entity', entity_type, 'metadata', metadata) order by id) from public.audit_logs where id > ${auditFrom}`) ?? [];
  const entry = audit.find((item) => item.action === 'site_settings.update' && item.actor === actorId);
  if (!entry || entry.type !== 'admin' || entry.entity !== 'cms_site_settings' || JSON.stringify([...(entry.metadata?.changed_keys ?? [])].sort()) !== JSON.stringify([...KEYS].sort())) problems.push(`audit_logs ${JSON.stringify(audit).slice(0, 160)}`);
  if (JSON.stringify(audit).match(/eyJ[A-Za-z0-9_-]{10,}|service_role|password/i)) problems.push('audit_logs 含敏感資料');
  return problems;
}

const servers = [];
installSignalCleanup(servers);
let browser;
let builtOnce = false;

try {
  // =========================================================================
  // A. Admin UI（DATA_SOURCE=supabase）
  // =========================================================================
  if (!args.has('--skip-ui')) {
    if (!args.has('--skip-admin-build')) {
      const built = spawnSync('pnpm --filter @syt/admin build', { cwd: ROOT, shell: true, stdio: 'inherit', env: { ...process.env, DATA_SOURCE: 'mock' } }).status === 0;
      if (!built) throw new Error('admin build 失敗');
    }
    // admin 本身不需要 service role：只傳 anon key，證明讀寫都走使用者 session + RLS
    const adminEnv = appEnv(env);
    const server = await startAdminServer({ env: { ...adminEnv, SUPABASE_SERVICE_ROLE_KEY: '' } });
    servers.push(server);
    browser = await chromium.launch({ executablePath: findChrome(), headless: true });

    const login = async (role, next = '/admin/cms/site-settings') => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/admin/login?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', accounts[role].email);
      await page.fill('input[name="password"]', accounts[role].password);
      await Promise.all([page.waitForURL((url) => !url.pathname.endsWith('/login') || url.searchParams.has('error'), { timeout: 60000 }), page.locator('form button[type="submit"]').first().click()]);
      await page.waitForLoadState('networkidle');
      return { context, page };
    };

    // 3–5. owner
    {
      const { context, page } = await login('owner');
      const onPage = new URL(page.url()).pathname === '/admin/cms/site-settings';
      const loadedEn = await page.inputValue('input[name="brand_name_en"]').catch(() => '');
      const loadedZh = await page.inputValue('input[name="brand_name_zh"]').catch(() => '');
      const loadedFavicon = await page.inputValue('input[name="favicon_url"]').catch(() => '');
      const editable = !(await page.locator('[data-testid="site-settings-form"] fieldset[disabled]').count());
      const noMockNotice = !(await page.getByText('Mock 模式').count());
      record(
        3,
        'owner 登入（Supabase Auth）後 /admin/cms/site-settings 載入 DB 內容且可編輯',
        onPage && loadedZh === originalSettings.brand.brandNameZh && loadedEn === originalSettings.brand.brandNameEn && loadedFavicon === originalSettings.brand.faviconUrl && editable && noMockNotice,
        `url=${new URL(page.url()).pathname} zh=${loadedZh} en=${loadedEn} favicon=${loadedFavicon} editable=${editable}`,
      );

      const before = snapshot();
      const auditFrom = auditMaxId();
      await page.fill('input[name="brand_name_en"]', TEST.brandNameEn);
      await page.fill('input[name="social.instagram.url"]', TEST.instagram);
      // ToggleField 的 checkbox 是 sr-only，與使用者相同以點擊 label 切換
      const setToggle = async (name, value) => {
        const input = page.locator(`input[name="${name}"]`);
        if ((await input.isChecked()) !== value) await page.locator(`label[for="toggle-${name}"]`).click();
        if ((await input.isChecked()) !== value) throw new Error(`無法切換 ${name}`);
      };
      await setToggle('social.instagram.enabled', true);
      await setToggle('fa.default_collapsed', !(await page.locator('input[name="fa.default_collapsed"]').isChecked()));
      await page.locator('[data-testid="site-settings-form"] button[type="submit"]').click();
      await page.getByRole('status').filter({ hasText: '已儲存' }).waitFor({ timeout: 30000 });
      const statusText = (await page.getByRole('status').textContent()) ?? '';
      record(4, 'owner 在後台表單修改 SEN YING TEST / Instagram 測試網址 / 預設收合並儲存', statusText.includes('已儲存'), statusText.trim().slice(0, 60));

      const after = snapshot();
      const problems = testValueProblems(before, after, { actorId: accounts.owner.id, auditFrom });
      record(5, '直接查 DB：值更新、updated_at / updated_by、只改目標列、無重複列、JSON 有效、audit_logs（site_settings.update）', problems.length === 0, problems.join(' | ') || `updated_at ${KEYS.map((key) => byKey(after, key).u).join(' / ')}`);
      await context.close();
    }

    // 6. editor / viewer / author / customer
    {
      const results = [];
      for (const role of ['editor', 'viewer']) {
        const { context, page } = await login(role);
        const onPage = new URL(page.url()).pathname === '/admin/cms/site-settings';
        // 等表單實際渲染後再判斷（count() / isDisabled() 不會自動等待，loading 畫面時會誤判）；最多等 15 秒唯讀狀態出現，未出現仍判定失敗
        await page.locator('[data-testid="site-settings-form"]').waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
        const disabled = await page
          .locator('[data-testid="site-settings-form"] fieldset[disabled]')
          .waitFor({ state: 'attached', timeout: 15000 })
          .then(() => true)
          .catch(() => false);
        const submitDisabled = await page.locator('[data-testid="site-settings-form"] button[type="submit"]').isDisabled().catch(() => false);
        const shows = await page.inputValue('input[name="brand_name_en"]').catch(() => '');
        results.push({ role, ok: onPage && disabled && submitDisabled && shows === TEST.brandNameEn, detail: `readonly=${disabled && submitDisabled} value=${shows}` });
        await context.close();
      }
      {
        const { context, page } = await login('author');
        // 登入後先導向 next（/admin/cms/site-settings），page guard 再 redirect 到 forbidden；等待最終網址
        await page.waitForURL((url) => url.searchParams.get('error') === 'forbidden', { timeout: 30000 }).catch(() => undefined);
        const url = new URL(page.url());
        results.push({ role: 'author', ok: url.pathname !== '/admin/cms/site-settings' && (await page.locator('[data-testid="site-settings-form"]').count()) === 0, detail: `${url.pathname}${url.search}` });
        await context.close();
      }
      {
        const { context, page } = await login('customer');
        const url = new URL(page.url());
        results.push({ role: 'customer', ok: url.pathname === '/admin/login' && url.searchParams.get('error') === 'not_admin', detail: `${url.pathname}${url.search}` });
        await context.close();
      }
      record(6, 'editor / viewer 唯讀（fieldset + 儲存按鈕停用）、author 被路由擋下、customer 不是後台成員', results.every((item) => item.ok), results.map((item) => `${item.role}:${item.ok ? 'ok' : 'FAIL'}(${item.detail})`).join(' · '));
    }

    // 7. repository 還原
    const restored = await ownerRepo.siteSettings.updateMarketingSiteSettings(originalSettings);
    record(7, 'owner server-side repository 還原原始設定（內容與原始相同）', restored.persisted && content(snapshot()) === content(original), `changedKeys=${restored.changedKeys.join(',')}`);
    await browser.close();
    browser = undefined;
    await stopAll(servers.splice(0));
  }

  // =========================================================================
  // B. Round trip
  // =========================================================================
  const before = snapshot();
  const auditFrom = auditMaxId();
  const update = await ownerRepo.siteSettings.updateMarketingSiteSettings(withTestValues(originalSettings));
  record(8, 'server-side repository（owner session，RLS）更新測試值', update.persisted && update.changedKeys.length === 3 && update.auditLogged, JSON.stringify(update));
  const afterUpdate = snapshot();
  const problems = testValueProblems(before, afterUpdate, { actorId: accounts.owner.id, auditFrom });
  record(9, '查 DB：測試值已寫入、只改目標列、audit_logs', problems.length === 0, problems.join(' | ') || 'ok');

  const denied = [];
  for (const role of ['editor', 'viewer', 'author', 'customer']) {
    const repo = await repoFor(role);
    const settings = await repo.siteSettings.getMarketingSiteSettings();
    let error = null;
    try {
      await repo.siteSettings.updateMarketingSiteSettings({ ...settings, brand: { ...settings.brand, brandNameEn: `${role.toUpperCase()} HACK` } });
    } catch (caught) {
      error = caught;
    }
    denied.push({ role, ok: db.isPermissionDeniedError(error) && content(snapshot()) === content(afterUpdate), name: error?.name ?? 'no error' });
  }
  record(10, 'editor / viewer / author / customer 透過 repository 寫入 → SupabasePermissionError，DB 不變', denied.every((item) => item.ok), denied.map((item) => `${item.role}:${item.name}`).join(' · '));

  const built = buildMarketing(env);
  builtOnce = built;
  record(11, 'Marketing build（DATA_SOURCE=supabase + 本機 anon key，無 service role）', built, rel(SUPABASE_DIST));
  if (built) {
    const dist = distValues();
    const serviceRoleLeak = dist.files.filter((file) => read(file).includes(env.serviceRoleKey)).map(rel);
    const checks = {
      header: dist.headerEn === TEST.brandNameEn,
      footer: dist.footerEn === TEST.brandNameEn,
      title: dist.title.includes(`森映 ${TEST.brandNameEn}`),
      ogSiteName: dist.siteName === `森映 ${TEST.brandNameEn}`,
      jsonLd: dist.organizationName === `森映 ${TEST.brandNameEn}`,
      floatingInstagram: dist.instagramInRail,
      defaultCollapsed: dist.defaultCollapsed === String(!originalSettings.floatingActions.defaultCollapsed),
      sameAs: dist.sameAs.includes(TEST.instagram),
      logoFallback: dist.logoSource === 'fallback' && dist.markUse,
      favicon: dist.favicon === (originalSettings.brand.faviconUrl || '/brand/favicon.svg'),
      noServiceRole: serviceRoleLeak.length === 0,
    };
    record(12, 'dist 使用 DB 值：Header / Footer / title / og:site_name / JSON-LD / Floating Actions / sameAs / logo fallback / favicon，無 service role', Object.values(checks).every(Boolean), Object.entries(checks).map(([key, ok]) => `${key}:${ok}`).join(' '));
  }
} catch (error) {
  record(99, 'integration 流程', false, error.message.split('\n')[0]);
} finally {
  await browser?.close().catch(() => undefined);
  await stopAll(servers);

  // 13. rollback（一定執行）
  let rollback = 'repository';
  try {
    await ownerRepo.siteSettings.updateMarketingSiteSettings(originalSettings);
  } catch {
    rollback = 'repository failed';
  }
  if (content(snapshot()) !== content(original)) {
    const forced = forceRestore(original);
    rollback = forced.ok ? `${rollback} → postgres restore` : `${rollback} → postgres restore FAILED`;
  }
  record(13, 'rollback 成原始值（finally，一定執行）', !rollback.includes('FAILED'), rollback);

  // 14. DB 確認
  const final = snapshot();
  const finalBrand = byKey(final, 'site.brand')?.v ?? {};
  const instagram = (byKey(final, 'site.socials')?.v?.items ?? []).find((item) => item.platform === 'instagram');
  record(
    14,
    '查 DB：rollback 成功（內容與原始完全相同、SEN YING、Instagram 網址還原、沒有多出設定列）',
    content(final) === content(original) && finalBrand.name_en === 'SEN YING' && instagram?.url === (originalSettings.socials.find((item) => item.platform === 'instagram')?.url ?? '') && final.length === original.length,
    `brand.name_en=${finalBrand.name_en} instagram=${JSON.stringify(instagram?.url)}`,
  );

  // 15. rebuild 確認 dist 回到原始值
  if (builtOnce) {
    const rebuilt = buildMarketing(env);
    const dist = rebuilt ? distValues() : null;
    record(
      15,
      'Admin 更新 DB → Astro rebuild → dist 反映：rollback 後重新 build 回到 SEN YING、沒有測試網址',
      Boolean(dist) && dist.headerEn === 'SEN YING' && dist.organizationName === '森映 SEN YING' && !dist.anyTestUrl && !dist.sameAs.includes(TEST.instagram),
      dist ? `header=${dist.headerEn} sameAs=${JSON.stringify(dist.sameAs)} testUrl=${dist.anyTestUrl}` : 'rebuild failed',
    );
  }
  // 清理：還原原始列（含 updated_at / updated_by）、刪除本次測試產生的 audit 紀錄（audit_logs 只允許 postgres 刪除）、刪除測試帳號
  await Promise.all(clients.map((client) => client.auth.signOut().catch(() => undefined)));
  const cleanup = [];
  cleanup.push(forceRestore(original).ok ? 'rows restored' : 'rows restore FAILED');
  const auditDelete = psql(`delete from public.audit_logs where id > ${auditStart} and action = 'site_settings.update' and entity_type = 'cms_site_settings';`);
  cleanup.push(auditDelete.ok ? 'test audit rows deleted' : 'audit cleanup FAILED');
  try {
    cleanup.push(`${await cleanupTestAccounts(env)} test accounts deleted`);
  } catch (error) {
    cleanup.push(`accounts cleanup FAILED: ${error.message}`);
  }
  const leftovers = psqlJson(`select json_build_object('audit', (select count(*) from public.audit_logs where id > ${auditStart}), 'profiles', (select count(*) from public.admin_profiles p join auth.users u on u.id = p.user_id where u.email like 'phase28.%'))`);
  record(
    17,
    '清理：設定列完全還原（含 updated_at / updated_by）、測試 audit 紀錄與測試帳號已刪除',
    !cleanup.some((item) => item.includes('FAILED')) && JSON.stringify(snapshot()) === JSON.stringify(original) && leftovers?.audit === 0 && leftovers?.profiles === 0,
    `${cleanup.join(' · ')} · leftovers ${JSON.stringify(leftovers)}`,
  );
  const currentMtime = existsSync(path.join(MARKETING_DIR, 'dist', 'index.html')) ? statSync(path.join(MARKETING_DIR, 'dist', 'index.html')).mtimeMs : null;
  record(16, 'apps/marketing/dist（預設 mock build）未被覆蓋；Marketing 維持 static，不做 SSR / realtime', currentMtime === marketingDistMtime && !/output:\s*'server'/.test(read(path.join(MARKETING_DIR, 'astro.config.mjs'))), `dist mtime unchanged=${currentMtime === marketingDistMtime}`);
  void ADMIN_DIR;
}

report.finish('site-settings:verify');
