// Phase 2.6C 全站 UI 驗收：SEN YING 品牌、Floating Actions、購物車 Badge、手機 Bottom Sheet、Admin 全站設定
//
// 做法：
//   - 預設 build（mock 預設設定：購物車捷徑關閉、未提供網址的社群不顯示）
//   - 驗收 build（SITE_SETTINGS_MOCK_PRESET=verification：example.com 網址、購物車捷徑開啟）
//     以 ASTRO_OUT_DIR 直接輸出到 .global-ui-report/verification-dist，不經過 apps/marketing/dist，
//     因此 apps/marketing/dist 永遠是預設設定，也不需要再 build 一次還原
//   - 以本機 Chrome 檢查收合 / 展開、aria、localStorage、badge、bottom sheet、遮擋
//
// 用法：pnpm global-ui:verify [--skip-build] [--skip-rwd]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ADMIN_DIR, MARKETING_DIR, ROOT, findChrome, installSignalCleanup, startMarketingServer, stopAll } from './lib/servers.mjs';

const args = new Set(process.argv.slice(2));
const DIST = path.join(MARKETING_DIR, 'dist');
const REPORT_DIR = path.join(ROOT, '.global-ui-report');
const VERIFY_DIST = path.join(REPORT_DIR, 'verification-dist');
const results = [];
const record = (no, name, ok, detail = '') => results.push({ no, name, ok: Boolean(ok), detail: String(detail ?? '') });
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const WIDTHS = [375, 430, 768, 1024, 1280, 1440];

function walk(dir, skip = new Set(['node_modules', 'cache'])) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : walk(full, skip);
    return [full];
  });
}

function run(command, env = {}) {
  console.log(`\n[global-ui] $ ${command}${Object.keys(env).length ? `  (${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ')})` : ''}`);
  return spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, DATA_SOURCE: 'mock', ...env } }).status === 0;
}

const tagAttr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const htmlOf = (dist, route) => read(route === '/' ? path.join(dist, 'index.html') : path.join(dist, ...route.split('/').filter(Boolean), 'index.html'));
const socialsIn = (html) => [...html.matchAll(/<a\b[^>]*\sdata-social="([^"]+)"[^>]*>/g)].map((match) => ({ platform: match[1], href: tagAttr(match[0], 'href') }));
const floatingHtml = (html) => html.match(/<div\b[^>]*data-floating-actions[\s\S]*$/)?.[0]?.split('</body>')[0] ?? '';

const settingsModule = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts')).href);
const defaultSettings = settingsModule.getMockMarketingSiteSettings('default');
const verificationSettings = settingsModule.getMockMarketingSiteSettings('verification');

// ---------------------------------------------------------------------------
// 27. Build（預設 build + 驗收 build）
// ---------------------------------------------------------------------------
{
  // build isolation（與 cms-integration / site-settings / seo 驗收相同做法）：
  //   - 預設 build 是唯一會寫入 apps/marketing/dist 的一次（其他驗收腳本也讀這一份）
  //   - 驗收 preset build 以 ASTRO_OUT_DIR 輸出到 .global-ui-report/verification-dist
  // 先前的做法是「preset build 蓋掉 dist → 整包複製 → 再 build 一次還原 dist」，
  // 同一輪就對 dist 刪寫三次又整包複製；在 OneDrive 同步路徑上會出現
  // .prerender/chunks/*.mjs 讀不到與 libuv handle assertion。現在完全不需要還原。
  const steps = [];
  if (!args.has('--skip-build')) steps.push(['pnpm build（預設設定 → apps/marketing/dist）', run('pnpm build')]);
  rmSync(VERIFY_DIST, { recursive: true, force: true });
  const presetBuilt = run('pnpm --filter @syt/marketing build', {
    SITE_SETTINGS_MOCK_PRESET: 'verification',
    ASTRO_OUT_DIR: path.relative(MARKETING_DIR, VERIFY_DIST).split(path.sep).join('/'),
  });
  steps.push([`marketing build（verification preset → ${rel(VERIFY_DIST)}）`, presetBuilt]);
  record(
    27,
    'build 通過（預設 build 寫 dist、驗收 build 寫獨立資料夾，同一輪不重複覆蓋 dist）',
    steps.every(([, ok]) => ok) && existsSync(path.join(VERIFY_DIST, 'index.html')) && existsSync(path.join(DIST, 'index.html')),
    steps.map(([name, ok]) => `${ok ? '✓' : '✗'} ${name}`).join(' / '),
  );
}

const defaultHome = htmlOf(DIST, '/');
const verifyHome = htmlOf(VERIFY_DIST, '/');

// ---------------------------------------------------------------------------
// 1. 元件
// ---------------------------------------------------------------------------
{
  const component = path.join(MARKETING_DIR, 'src', 'components', 'FloatingActions.astro');
  const layout = read(path.join(MARKETING_DIR, 'src', 'layouts', 'BaseLayout.astro'));
  record(
    1,
    'FloatingActions component 存在，全站 layout 載入，build 輸出含快捷列',
    existsSync(component) && /<FloatingActions\s+settings=\{siteSettings\}/.test(layout) && /data-floating-actions/.test(defaultHome) && /data-floating-actions/.test(verifyHome),
    rel(component),
  );
}

// ---------------------------------------------------------------------------
// 5–8. 設定來源 / disabled / 空網址 / 購物車關閉（build 輸出）
// ---------------------------------------------------------------------------
{
  const component = read(path.join(MARKETING_DIR, 'src', 'components', 'FloatingActions.astro'));
  const footer = read(path.join(MARKETING_DIR, 'src', 'components', 'Footer.astro'));
  const HARDCODED = /(line\.me|instagram\.com|facebook\.com|threads\.net|youtube\.com|tiktok\.com|mailto:|tel:)/i;
  const expectedDefault = settingsModule.resolveVisibleSocials(defaultSettings.socials, 'desktop').map((item) => `${item.platform}=${item.url}`);
  const expectedVerify = settingsModule.resolveVisibleSocials(verificationSettings.socials, 'desktop').map((item) => `${item.platform}=${item.url}`);
  const railLinks = (html) => {
    const rail = html.match(/<div\b[^>]*data-fa-expanded[\s\S]*?<\/nav>/)?.[0] ?? '';
    return socialsIn(rail).map((item) => `${item.platform}=${item.href}`);
  };
  const problems = [];
  if (HARDCODED.test(component) || HARDCODED.test(footer)) problems.push('元件內有寫死的社群網址');
  if (!/floatingActionsView\(settings\)/.test(component)) problems.push('元件沒有使用 floatingActionsView(settings)');
  if (JSON.stringify(railLinks(defaultHome)) !== JSON.stringify(expectedDefault)) problems.push(`預設 build：${railLinks(defaultHome).join(', ')} ≠ ${expectedDefault.join(', ')}`);
  if (JSON.stringify(railLinks(verifyHome)) !== JSON.stringify(expectedVerify)) problems.push(`驗收 build：${railLinks(verifyHome).join(', ')} ≠ ${expectedVerify.join(', ')}`);
  record(5, 'social links 由全站設定產生（不是寫死），順序依 sortOrder', problems.length === 0, problems.join('; ') || `預設 ${expectedDefault.length} 個 / 驗收 ${expectedVerify.length} 個`);

  const rendered = (html) => new Set(socialsIn(floatingHtml(html)).map((item) => item.platform).concat(socialsIn(html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '').map((item) => item.platform)));
  const disabledDefault = defaultSettings.socials.filter((item) => !item.enabled).map((item) => item.platform);
  const disabledVerify = verificationSettings.socials.filter((item) => !item.enabled).map((item) => item.platform);
  const disabledHits = [...disabledDefault.filter((p) => rendered(defaultHome).has(p)), ...disabledVerify.filter((p) => rendered(verifyHome).has(p))];
  const unsafe = settingsModule.resolveVisibleSocials(
    [{ id: 'x', platform: 'facebook', label: 'x', url: 'javascript:alert(1)', enabled: true, sortOrder: 1, openInNewTab: true, showOnDesktop: true, showOnMobile: true }],
    'any',
  );
  record(6, 'disabled social 不 render（含已填網址但停用的 TikTok）', disabledHits.length === 0 && unsafe.length === 0, disabledHits.join(', ') || `預設停用 ${disabledDefault.join('/')}，驗收停用 ${disabledVerify.join('/')}；javascript: 網址也不 render`);

  const emptyDefault = defaultSettings.socials.filter((item) => item.enabled && !item.url).map((item) => item.platform);
  const emptyVerify = verificationSettings.socials.filter((item) => item.enabled && !item.url).map((item) => item.platform);
  const emptyHits = [...emptyDefault.filter((p) => rendered(defaultHome).has(p)), ...emptyVerify.filter((p) => rendered(verifyHome).has(p))];
  const emptyHref = /<a\b[^>]*\sdata-social="[^"]+"[^>]*\shref=""|<a\b[^>]*\shref=""[^>]*\sdata-social=/.test(defaultHome + verifyHome);
  record(7, '啟用但 URL 空白的 social 不 render（沒有空 href）', emptyHits.length === 0 && !emptyHref, emptyHits.join(', ') || `預設空網址 ${emptyDefault.join('/')}，驗收空網址 ${emptyVerify.join('/')}`);

  const defaultPages = walk(DIST).filter((file) => file.endsWith('.html'));
  // 只比對實際輸出的元素屬性（Astro 會把小型 client script 內嵌到 HTML，script 內的 selector 字串不算購物車 UI）
  const CART_ELEMENT = /<[a-z][^>]*\sdata-cart-(link|badge|count-text)(?=[\s=>])/;
  const cartHits = defaultPages.filter((file) => CART_ELEMENT.test(read(file).replace(/<script\b[\s\S]*?<\/script>/g, ''))).map(rel);
  record(8, 'cartEnabled=false（預設）時完全不 render 購物車 UI', defaultSettings.floatingActions.cartEnabled === false && cartHits.length === 0 && /data-cart-link/.test(verifyHome), cartHits.slice(0, 3).join(', ') || `${defaultPages.length} 頁無購物車；驗收 build 有購物車`);
}

// ---------------------------------------------------------------------------
// 19–20. 品牌
// ---------------------------------------------------------------------------
{
  const header = defaultHome.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
  const footer = defaultHome.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
  const brandOk = (html) => /data-brand-zh[^>]*>森映</.test(html) && /data-brand-en[^>]*>SEN YING</.test(html) && html.includes('森映 SEN YING 首頁');
  const titleOk = /<title>[^<]*SEN YING[^<]*<\/title>/.test(defaultHome);
  // JSON-LD 比對前移除空白，名稱也以移除空白後的「森映SENYING」比對
  const jsonLdOk = /"@type":"Organization"[^}]*"name":"森映SENYING"/.test(defaultHome.replace(/\s+/g, ''));
  record(19, 'Header / Footer / title / Organization JSON-LD 使用 森映 / SEN YING', brandOk(header) && brandOk(footer) && titleOk && jsonLdOk, `header ${brandOk(header)} · footer ${brandOk(footer)} · title ${titleOk} · JSON-LD ${jsonLdOk}`);

  // 白名單：非公開的 legacy 識別碼與歷史資料（不掃描）
  //   supabase/**、docs/**：DB seed 的 slug（mori-commerce / mori_ecommerce_site）、內部既有專案盤點、歷史規劃文件
  //   packages/shared/src/constants/brand.ts 註解中的「舊名稱」不含字串 Mori
  const LEGACY_IDENTIFIER = /mori[-_][a-z]/g;
  const PUBLIC_MORI = /mori/i;
  const scanFiles = [
    ...walk(DIST).filter((file) => /\.(html|js|css|xml|txt|json|svg)$/.test(file)),
    ...walk(VERIFY_DIST).filter((file) => /\.(html|js|xml|txt|json)$/.test(file)),
    ...walk(path.join(MARKETING_DIR, 'src')),
    ...walk(path.join(ADMIN_DIR, 'src')),
    ...['ui', 'shared', 'seo', 'auth', 'database'].flatMap((name) => walk(path.join(ROOT, 'packages', name, 'src'))),
    ...walk(path.join(ADMIN_DIR, '.next', 'server', 'app')).filter((file) => /\.(html|rsc|body|meta)$/.test(file)),
  ];
  const hits = scanFiles.filter((file) => PUBLIC_MORI.test(read(file).replace(LEGACY_IDENTIFIER, ''))).map(rel);
  record(20, `public-facing（marketing dist / src、admin src / .next 預渲染、packages）不出現 Mori / MORI（${scanFiles.length} files）`, hits.length === 0, hits.slice(0, 5).join(', ') || 'clean（legacy SQL 識別碼白名單：supabase/**、docs/**）');
}

// ---------------------------------------------------------------------------
// 21–25. Admin 全站設定 / client bundle
// ---------------------------------------------------------------------------
{
  const page = read(path.join(ADMIN_DIR, 'src', 'app', 'admin', '(console)', 'cms', 'site-settings', 'page.tsx'));
  const actions = read(path.join(ADMIN_DIR, 'src', 'app', 'admin', '(console)', 'cms', 'site-settings', 'actions.ts'));
  const permissions = read(path.join(ROOT, 'packages', 'auth', 'src', 'permissions.ts'));
  const navigation = read(path.join(ADMIN_DIR, 'src', 'lib', 'navigation.ts'));
  const form = read(path.join(ADMIN_DIR, 'src', 'components', 'cms', 'SiteSettingsForm.tsx'));
  const parser = read(path.join(ADMIN_DIR, 'src', 'lib', 'site-settings', 'form.ts'));
  const rule = permissions.match(/\{\s*prefix: '\/admin\/cms\/site-settings'[\s\S]*?\}/)?.[0] ?? '';
  record(
    21,
    '/admin/cms/site-settings route 存在（page guard、路由權限、CMS 選單、server action 權限檢查）',
    page.includes("requireAdminPage('/admin/cms/site-settings')") &&
      /roles: \['owner', 'admin', 'editor', 'viewer'\]/.test(rule) &&
      /readOnlyRoles: \['editor', 'viewer'\]/.test(rule) &&
      !rule.includes("'author'") &&
      navigation.includes("href: '/admin/cms/site-settings'") &&
      /canAdmin\(session\.role, 'cms_settings', 'update'\)/.test(actions),
    'owner / admin 可寫；editor / viewer 唯讀；author 不可進',
  );
  const has = (source, names) => names.filter((name) => !source.includes(name));
  const socialMissing = [...has(form, ['`${prefix}.enabled`', '`${prefix}.url`', '`${prefix}.sort_order`', '`${prefix}.label`', '`${prefix}.open_in_new_tab`', '`${prefix}.show_on_desktop`', '`${prefix}.show_on_mobile`']), ...has(parser, ['.enabled`', '.url`', '.sort_order`'])];
  record(22, 'admin settings 有 social enable / label / URL / sort / 新視窗 / 桌機 / 手機', socialMissing.length === 0, socialMissing.join(', ') || 'SiteSettingsForm + parseSiteSettingsForm');
  const faMissing = [...has(form, ['"fa.enabled"', '"fa.default_collapsed"', '"fa.desktop_enabled"', '"fa.mobile_enabled"']), ...has(parser, ["'fa.enabled'", "'fa.default_collapsed'", "'fa.desktop_enabled'", "'fa.mobile_enabled'"])];
  record(23, 'admin settings 有 Floating Action 設定（啟用 / 預設收合 / 桌機 / 手機）', faMissing.length === 0, faMissing.join(', ') || 'ok');
  const cartMissing = [...has(form, ['"cart.enabled"', '"cart.href"', '"cart.label"', '"cart.show_badge"']), ...has(parser, ["'cart.enabled'", "'cart.href'", "'cart.label'", "'cart.show_badge'"])];
  record(24, 'cart shortcut 設定存在（enabled / href / label / showBadge，預設關閉）', cartMissing.length === 0 && defaultSettings.floatingActions.cartEnabled === false, cartMissing.join(', ') || 'ok');

  const clientFiles = [
    ...walk(DIST).filter((file) => /\.(js|html)$/.test(file)),
    ...walk(path.join(ADMIN_DIR, '.next', 'static')).filter((file) => file.endsWith('.js')),
  ];
  const LEAK = /SUPABASE_SERVICE_ROLE_KEY|service_role|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\bsb_secret_[A-Za-z0-9_-]{16,}/;
  const leaks = clientFiles.filter((file) => LEAK.test(read(file))).map(rel);
  record(25, `client bundle 不含 service role / 密鑰（marketing dist + admin .next/static，${clientFiles.length} files）`, clientFiles.length > 0 && leaks.length === 0, leaks.slice(0, 3).join(', ') || 'clean');
}

// ---------------------------------------------------------------------------
// Runtime（Chrome）
// ---------------------------------------------------------------------------
const servers = [];
installSignalCleanup(servers);
let browser;
const isVisible = (page, selector) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }, selector);
const ready = (page) => page.waitForSelector('[data-floating-actions][data-ready="true"]', { state: 'attached', timeout: 15000 });
const setCart = (page, count) =>
  page.evaluate((itemCount) => window.dispatchEvent(new CustomEvent('syt:cart-updated', { detail: { itemCount } })), count);
const badgeState = (page, scope) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return { exists: false, visible: false, text: '' };
    const rect = element.getBoundingClientRect();
    return { exists: true, visible: !element.hidden && rect.width > 0, text: element.textContent ?? '' };
  }, scope);

try {
  if (!existsSync(path.join(VERIFY_DIST, 'index.html'))) throw new Error('verification build missing');
  const verifyServer = await startMarketingServer({ distDir: VERIFY_DIST });
  servers.push(verifyServer);
  const defaultServer = await startMarketingServer();
  servers.push(defaultServer);
  browser = await chromium.launch({ executablePath: findChrome(), headless: true });

  // ---- 桌機 1440（驗收 build）----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${verifyServer.url}/`, { waitUntil: 'networkidle' });
    await ready(page);

    const expandedAtStart = (await isVisible(page, '[data-fa-expanded]')) && !(await isVisible(page, '[data-fa-compact]'));
    const collapseButton = page.locator('[data-fa-expanded] [data-fa-toggle]');
    const compactButton = page.locator('[data-fa-compact]');
    const ariaExpandedBefore = await collapseButton.getAttribute('aria-expanded');
    await collapseButton.click();
    const collapsed = (await isVisible(page, '[data-fa-compact]')) && !(await isVisible(page, '[data-fa-expanded]'));
    const ariaCollapsed = await compactButton.getAttribute('aria-expanded');
    const focusOnCompact = await page.evaluate(() => document.activeElement?.hasAttribute('data-fa-compact') ?? false);
    const storedCollapsed = await page.evaluate(() => window.localStorage.getItem('syt-floating-actions-collapsed'));
    await compactButton.click();
    const expandedAgain = (await isVisible(page, '[data-fa-expanded]')) && !(await isVisible(page, '[data-fa-compact]'));
    const ariaExpandedAfter = await collapseButton.getAttribute('aria-expanded');
    await page.locator('[data-fa-expanded] a[data-social]').first().focus();
    await page.keyboard.press('Escape');
    const escCollapsed = await isVisible(page, '[data-fa-compact]');
    await compactButton.click();
    record(2, 'Desktop rail 可展開 / 收合（按鈕與 ESC），預設依設定展開', expandedAtStart && collapsed && expandedAgain && escCollapsed, JSON.stringify({ expandedAtStart, collapsed, expandedAgain, escCollapsed }));
    record(
      3,
      'aria-expanded 正確（展開 true / 收合 false）+ aria-controls + 收合後焦點移到 compact 按鈕',
      ariaExpandedBefore === 'true' && ariaCollapsed === 'false' && ariaExpandedAfter === 'true' && focusOnCompact && (await compactButton.getAttribute('aria-controls')) === 'fa-rail',
      JSON.stringify({ ariaExpandedBefore, ariaCollapsed, ariaExpandedAfter, focusOnCompact }),
    );

    // localStorage 記憶
    await collapseButton.click();
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);
    const rememberedCollapsed = (await isVisible(page, '[data-fa-compact]')) && (await page.getAttribute('[data-floating-actions]', 'data-state')) === 'collapsed';
    await page.locator('[data-fa-compact]').click();
    const storedExpanded = await page.evaluate(() => window.localStorage.getItem('syt-floating-actions-collapsed'));
    const blockedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await blockedContext.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage blocked');
        },
      });
    });
    const blockedPage = await blockedContext.newPage();
    const blockedErrors = [];
    blockedPage.on('pageerror', (error) => blockedErrors.push(error.message));
    await blockedPage.goto(`${verifyServer.url}/`, { waitUntil: 'networkidle' });
    await ready(blockedPage);
    await blockedPage.locator('[data-fa-expanded] [data-fa-toggle]').click();
    const blockedWorks = await isVisible(blockedPage, '[data-fa-compact]');
    await blockedContext.close();
    record(
      4,
      '收合偏好存在 localStorage（syt-floating-actions-collapsed），跨頁維持；localStorage 不可用時不報錯',
      storedCollapsed === 'true' && rememberedCollapsed && storedExpanded === 'false' && blockedWorks && blockedErrors.length === 0,
      JSON.stringify({ storedCollapsed, rememberedCollapsed, storedExpanded, blockedWorks, blockedErrors }),
    );

    // Badge
    const railBadge = '[data-fa-expanded] [data-cart-link] [data-cart-badge]';
    await setCart(page, 0);
    const b0 = await badgeState(page, railBadge);
    const anyVisibleAt0 = await page.evaluate(() => [...document.querySelectorAll('[data-cart-badge]')].some((element) => !element.hidden));
    record(9, 'cartCount=0 無 badge', b0.exists && !b0.visible && !anyVisibleAt0, JSON.stringify(b0));
    await setCart(page, 1);
    const b1 = await badgeState(page, railBadge);
    const label1 = await page.getAttribute('[data-fa-expanded] [data-cart-link]', 'aria-label');
    record(10, 'cartCount=1 顯示 1（aria-label 含數量）', b1.visible && b1.text === '1' && /1 件/.test(label1 ?? ''), `${JSON.stringify(b1)} · ${label1}`);
    await setCart(page, 12);
    const b12 = await badgeState(page, railBadge);
    await page.reload({ waitUntil: 'networkidle' });
    await ready(page);
    const b12AfterReload = await badgeState(page, railBadge);
    record(11, 'cartCount=12 顯示 12（重新整理後由 cart store 讀回）', b12.visible && b12.text === '12' && b12AfterReload.text === '12' && b12AfterReload.visible, `${JSON.stringify(b12)} → reload ${JSON.stringify(b12AfterReload)}`);
    await setCart(page, 99);
    const b99 = await badgeState(page, railBadge);
    await setCart(page, 100);
    const b100 = await badgeState(page, railBadge);
    const label100 = await page.getAttribute('[data-fa-expanded] [data-cart-link]', 'aria-label');
    record(12, 'cartCount=99 顯示 99；cartCount=100 顯示 99+', b99.text === '99' && b100.visible && b100.text === '99+' && /99\+ 件/.test(label100 ?? ''), `99 → ${b99.text} · 100 → ${b100.text} · ${label100}`);

    await setCart(page, 3);
    await page.locator('[data-fa-expanded] [data-fa-toggle]').click();
    const compactBadge = await badgeState(page, '[data-fa-compact] [data-cart-badge]');
    const compactLabel = await page.getAttribute('[data-fa-compact]', 'aria-label');
    record(13, '收合後 compact 按鈕在 cartCount>0 時仍顯示 badge（aria-label 含購物車數量）', compactBadge.visible && compactBadge.text === '3' && /購物車 3 件/.test(compactLabel ?? ''), `${JSON.stringify(compactBadge)} · ${compactLabel}`);
    await page.locator('[data-fa-compact]').click();

    const sheetTriggerVisible = await isVisible(page, '[data-fa-sheet-open]');
    const sheetVisible = await isVisible(page, '[data-fa-sheet]');
    record(17, '桌機（1440）不顯示手機快捷按鈕與 Bottom Sheet', !sheetTriggerVisible && !sheetVisible && errors.length === 0, JSON.stringify({ sheetTriggerVisible, sheetVisible, errors }));
    await context.close();
  }

  // ---- 手機 375（驗收 build）----
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${verifyServer.url}/`, { waitUntil: 'networkidle' });
    await ready(page);
    const railVisible = (await isVisible(page, '[data-fa-desktop]')) || (await isVisible(page, '[data-fa-expanded]')) || (await isVisible(page, '[data-fa-compact]'));
    const triggerVisible = await isVisible(page, '[data-fa-sheet-open]');
    record(18, '手機（375）不顯示完整 desktop rail，只顯示單一快捷按鈕', !railVisible && triggerVisible, JSON.stringify({ railVisible, triggerVisible }));

    await setCart(page, 7);
    const mobileBadge = await badgeState(page, '[data-fa-sheet-open] [data-cart-badge]');
    const mobileLabel = await page.getAttribute('[data-fa-sheet-open]', 'aria-label');
    record(14, '手機 compact 按鈕在 cartCount>0 時顯示 badge', mobileBadge.visible && mobileBadge.text === '7' && /購物車 7 件/.test(mobileLabel ?? ''), `${JSON.stringify(mobileBadge)} · ${mobileLabel}`);

    await page.locator('[data-fa-sheet-open]').click();
    const opened = await isVisible(page, '[data-fa-sheet] [role="dialog"]');
    const sheetInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[data-fa-sheet] [role="dialog"]');
      const rect = dialog?.getBoundingClientRect();
      const labelId = dialog?.getAttribute('aria-labelledby');
      return {
        role: dialog?.getAttribute('role'),
        modal: dialog?.getAttribute('aria-modal'),
        label: labelId ? document.getElementById(labelId)?.textContent?.trim() : null,
        withinViewport: rect ? rect.left >= 0 && rect.right <= window.innerWidth + 1 : false,
        scrollLocked: document.documentElement.style.overflow === 'hidden',
        focusInside: dialog?.contains(document.activeElement) ?? false,
        expanded: document.querySelector('[data-fa-sheet-open]')?.getAttribute('aria-expanded'),
        socials: [...(dialog?.querySelectorAll('a[data-social]') ?? [])].map((a) => a.getAttribute('data-social')),
        cartText: dialog?.querySelector('[data-cart-count-text]')?.textContent?.trim(),
        paddingBottom: dialog ? getComputedStyle(dialog).paddingBottom : '',
      };
    });
    await page.keyboard.press('Escape');
    const closedByEsc = !(await isVisible(page, '[data-fa-sheet]'));
    const afterEsc = await page.evaluate(() => ({ overflow: document.documentElement.style.overflow, focus: document.activeElement?.hasAttribute('data-fa-sheet-open') ?? false }));
    await page.locator('[data-fa-sheet-open]').click();
    await page.mouse.click(180, 40);
    const closedByBackdrop = !(await isVisible(page, '[data-fa-sheet]'));
    await page.locator('[data-fa-sheet-open]').click();
    await page.locator('[data-fa-sheet] button[data-fa-sheet-close]').click();
    const closedByButton = !(await isVisible(page, '[data-fa-sheet]'));
    const expectedMobile = settingsModule.resolveVisibleSocials(verificationSettings.socials, 'mobile').map((item) => item.platform);
    record(
      15,
      '手機開 Bottom Sheet：鎖定捲動、焦點進入、ESC / backdrop / 關閉按鈕都能關閉，焦點回到按鈕；只列出手機顯示的平台',
      opened && sheetInfo.scrollLocked && sheetInfo.focusInside && sheetInfo.expanded === 'true' && closedByEsc && afterEsc.overflow !== 'hidden' && afterEsc.focus && closedByBackdrop && closedByButton && JSON.stringify(sheetInfo.socials) === JSON.stringify(expectedMobile) && sheetInfo.cartText === '7 件',
      JSON.stringify({ opened, ...sheetInfo, closedByEsc, afterEsc, closedByBackdrop, closedByButton, expectedMobile }),
    );
    record(16, 'Bottom Sheet 有 role="dialog"、aria-modal="true"、aria-labelledby，寬度不超出 375px', sheetInfo.role === 'dialog' && sheetInfo.modal === 'true' && Boolean(sheetInfo.label) && sheetInfo.withinViewport, JSON.stringify({ role: sheetInfo.role, modal: sheetInfo.modal, label: sheetInfo.label, withinViewport: sheetInfo.withinViewport }));
    await context.close();
  }

  // ---- 預設 build：購物車關閉時 runtime 也不出現 ----
  {
    const problems = [];
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(`${defaultServer.url}/`, { waitUntil: 'networkidle' });
      await ready(page);
      await setCart(page, 5);
      const cartUi = await page.evaluate(() => document.querySelectorAll('[data-cart-badge], [data-cart-link]').length);
      if (cartUi !== 0) problems.push(`${width}px: ${cartUi} cart elements`);
      await context.close();
    }
    const previous = results.find((item) => item.no === 8);
    if (previous) {
      previous.ok = previous.ok && problems.length === 0;
      previous.detail += problems.length ? ` · runtime: ${problems.join(', ')}` : ' · runtime 發出 syt:cart-updated(5) 後仍無購物車 UI';
    }
  }

  // ---- 28. 遮擋與水平捲軸（6 個寬度，驗收 build：購物車 + 全部社群）----
  {
    const problems = [];
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      for (const route of ['/', '/products', '/products/seo-website', '/checkout', '/blog']) {
        const page = await context.newPage();
        await page.goto(`${verifyServer.url}${route}`, { waitUntil: 'networkidle' });
        await ready(page);
        await setCart(page, 3);
        const issues = await page.evaluate(() => {
          const floating = ['[data-fa-expanded]', '[data-fa-compact]', '[data-fa-sheet-open]', 'nav[data-bottom-nav]', '[data-back-to-top]']
            .map((selector) => document.querySelector(selector))
            .filter((element) => element && !element.hidden && element.getBoundingClientRect().width > 0);
          const targets = [
            ...document.querySelectorAll(
              '[data-final-cta] a, [data-final-cta] button, [data-section="order-summary"] button, [data-section="order-summary"] a, [data-section="hero"] [data-cta], footer a, [data-section="product-cards"] a, [data-section="comparison"] th, header a, header button, header summary',
            ),
          ].filter((element) => !element.closest('[data-floating-actions]'));
          const found = [];
          const overlap = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
          for (const target of targets) {
            target.scrollIntoView({ block: 'center', inline: 'nearest' });
            const rect = target.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            for (const element of floating) {
              if (overlap(rect, element.getBoundingClientRect())) {
                found.push(`${target.tagName.toLowerCase()}「${(target.textContent ?? '').trim().slice(0, 12)}」× ${element.getAttribute('data-fa-expanded') !== null ? 'rail' : element.hasAttribute('data-fa-compact') ? 'compact' : element.hasAttribute('data-bottom-nav') ? 'bottom-nav' : element.hasAttribute('data-back-to-top') ? 'back-to-top' : 'mobile-button'}`);
                break;
              }
            }
            if (found.length >= 3) break;
          }
          window.scrollTo(0, document.documentElement.scrollHeight);
          const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          if (scrollWidth > window.innerWidth + 1) found.push(`horizontal scroll ${scrollWidth}`);
          return found;
        });
        if (issues.length) problems.push(`${width}px ${route}: ${issues.join(' | ')}`);
        await page.close();
      }
      await context.close();
    }
    record(28, 'Global Shell（浮動快捷列 / Bottom Nav / 回到頂端）不遮擋 Hero CTA / Final CTA / Checkout 摘要 / 產品卡 / 比較表 / Header / Footer，無水平捲軸（6 個寬度）', problems.length === 0, problems.slice(0, 4).join(' || ') || `${WIDTHS.join(' / ')} × 5 頁`);
  }

  // ---------------------------------------------------------------------------
  // 29–30. Header（桌機 / 手機）
  // ---------------------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);
    const desktop = await page.evaluate(() => {
      const header = document.querySelector('header[data-section="header"]');
      const style = header ? getComputedStyle(header) : null;
      const rect = header?.getBoundingClientRect();
      const navLinks = [...document.querySelectorAll('header[data-section="header"] nav[aria-label="主選單"] a')];
      const overlapsFloating = ['[data-fa-expanded]', '[data-fa-compact]']
        .map((selector) => document.querySelector(selector))
        .filter((element) => element && element.getBoundingClientRect().width > 0)
        .some((element) => {
          const a = element.getBoundingClientRect();
          return rect && a.left < rect.right - 1 && a.right > rect.left + 1 && a.top < rect.bottom - 1 && a.bottom > rect.top + 1;
        });
      return {
        position: style?.position,
        top: style?.top,
        zIndex: style?.zIndex,
        stuckToTop: rect ? Math.round(rect.top) === 0 : false,
        navCount: navLinks.length,
        current: navLinks.filter((a) => a.getAttribute('aria-current') === 'page').length,
        focusVisible: navLinks.every((a) => a.className.includes('focus-visible:outline')),
        search: Boolean(document.querySelector('header [data-header-action="search"]')),
        login: Boolean(document.querySelector('header [data-header-action="login"]')),
        cta: Boolean(document.querySelector('header [data-cta="header-start"]')),
        mobileMenuVisible: (document.querySelector('[data-header-menu]')?.getBoundingClientRect().width ?? 0) > 0,
        horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        overlapsFloating,
      };
    });
    // 捲動後仍固定在頂端，不跳動
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(120);
    const afterScroll = await page.evaluate(() => Math.round(document.querySelector('header[data-section="header"]').getBoundingClientRect().top));
    record(
      29,
      'Header 桌機：sticky 固定不跳動、主選單 / 搜尋 / 登入 / CTA 齊全、aria-current、focus-visible、不被浮動快捷列遮擋、無水平捲軸',
      desktop.position === 'sticky' &&
        desktop.stuckToTop &&
        afterScroll === 0 &&
        desktop.navCount >= 4 &&
        desktop.current === 1 &&
        desktop.focusVisible &&
        desktop.search &&
        desktop.login &&
        desktop.cta &&
        !desktop.mobileMenuVisible &&
        desktop.horizontal <= 1 &&
        !desktop.overlapsFloating,
      JSON.stringify({ ...desktop, afterScroll }),
    );
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);
    const mobile = await page.evaluate(() => {
      const trigger = document.querySelector('[data-header-menu]');
      return {
        triggerVisible: (trigger?.getBoundingClientRect().width ?? 0) > 0,
        tag: trigger?.tagName.toLowerCase(),
        haspopup: trigger?.getAttribute('aria-haspopup'),
        controls: trigger?.getAttribute('aria-controls'),
        expanded: trigger?.getAttribute('aria-expanded'),
        label: trigger?.getAttribute('aria-label'),
        size: trigger ? Math.round(Math.min(trigger.getBoundingClientRect().width, trigger.getBoundingClientRect().height)) : 0,
        desktopNavVisible: (document.querySelector('header nav[aria-label="主選單"]')?.getBoundingClientRect().width ?? 0) > 0,
        // 舊的 <details> 選單不可再存在（無法提供 ESC / focus trap / scroll lock）
        legacyDetails: document.querySelectorAll('header details').length,
      };
    });
    record(
      30,
      'Header 手機：漢堡為 button + aria-haspopup="dialog" / aria-controls / aria-expanded，touch target ≥ 44px，桌機主選單隱藏，不再使用 <details>',
      mobile.triggerVisible &&
        mobile.tag === 'button' &&
        mobile.haspopup === 'dialog' &&
        mobile.controls === 'nav-sheet' &&
        mobile.expanded === 'false' &&
        Boolean(mobile.label) &&
        mobile.size >= 44 &&
        !mobile.desktopNavVisible &&
        mobile.legacyDetails === 0,
      JSON.stringify(mobile),
    );
    await context.close();
  }

  // ---------------------------------------------------------------------------
  // 31. 手機主選單 Bottom Sheet（Header 漢堡與 Bottom Nav「更多」共用同一個 dialog）
  // ---------------------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);

    const uniqueClose = await page.evaluate(() => ({
      buttons: document.querySelectorAll('[data-nav-sheet] button[data-nav-sheet-close]').length,
      targets: document.querySelectorAll('[data-nav-sheet] [data-nav-sheet-close]').length,
      triggers: document.querySelectorAll('[data-nav-sheet-open]').length,
      sheets: document.querySelectorAll('[data-nav-sheet]').length,
    }));

    await page.locator('[data-header-menu]').click();
    const opened = await page.evaluate(() => {
      const dialog = document.querySelector('[data-nav-sheet] [role="dialog"]');
      const labelId = dialog?.getAttribute('aria-labelledby');
      return {
        visible: (dialog?.getBoundingClientRect().width ?? 0) > 0,
        modal: dialog?.getAttribute('aria-modal'),
        label: labelId ? document.getElementById(labelId)?.textContent?.trim() : null,
        scrollLocked: document.documentElement.style.overflow === 'hidden',
        focusInside: dialog?.contains(document.activeElement) ?? false,
        // 兩個觸發按鈕的 aria-expanded 都要同步
        expandedAll: [...document.querySelectorAll('[data-nav-sheet-open]')].every((el) => el.getAttribute('aria-expanded') === 'true'),
        links: dialog?.querySelectorAll('nav a').length ?? 0,
        withinViewport: dialog ? dialog.getBoundingClientRect().left >= 0 && dialog.getBoundingClientRect().right <= window.innerWidth + 1 : false,
      };
    });

    // focus trap：連按 Tab 超過可聚焦元素數量，焦點仍在 panel 內
    const focusCount = await page.evaluate(() => document.querySelectorAll('[data-nav-sheet] [role="dialog"] a[href], [data-nav-sheet] [role="dialog"] button').length);
    for (let index = 0; index < focusCount + 2; index += 1) await page.keyboard.press('Tab');
    const trapped = await page.evaluate(() => document.querySelector('[data-nav-sheet] [role="dialog"]')?.contains(document.activeElement) ?? false);

    await page.keyboard.press('Escape');
    const afterEsc = await page.evaluate(() => ({
      hidden: document.querySelector('[data-nav-sheet]').hidden,
      overflow: document.documentElement.style.overflow,
      focusRestored: document.activeElement?.hasAttribute('data-header-menu') ?? false,
      expandedAll: [...document.querySelectorAll('[data-nav-sheet-open]')].every((el) => el.getAttribute('aria-expanded') === 'false'),
    }));

    // Bottom Nav 的「更多」開同一個 sheet，backdrop 可關閉
    await page.locator('[data-bottom-nav] [data-nav-sheet-open]').click();
    const viaBottomNav = await page.evaluate(() => !document.querySelector('[data-nav-sheet]').hidden);
    await page.mouse.click(180, 40);
    const closedByBackdrop = await page.evaluate(() => document.querySelector('[data-nav-sheet]').hidden);

    // 可見關閉鍵
    await page.locator('[data-bottom-nav] [data-nav-sheet-open]').click();
    await page.locator('[data-nav-sheet] button[data-nav-sheet-close]').click();
    const closedByButton = await page.evaluate(() => ({
      hidden: document.querySelector('[data-nav-sheet]').hidden,
      overflow: document.documentElement.style.overflow,
    }));

    record(
      31,
      '手機主選單 Bottom Sheet：Header 漢堡與 Bottom Nav「更多」共用同一個 dialog，ESC / backdrop / 關閉鍵皆可關閉，focus trap + focus restore + scroll lock，button[data-nav-sheet-close] 唯一',
      uniqueClose.sheets === 1 &&
        uniqueClose.buttons === 1 &&
        uniqueClose.targets === 2 &&
        uniqueClose.triggers === 2 &&
        opened.visible &&
        opened.modal === 'true' &&
        Boolean(opened.label) &&
        opened.scrollLocked &&
        opened.focusInside &&
        opened.expandedAll &&
        opened.links >= 4 &&
        opened.withinViewport &&
        trapped &&
        afterEsc.hidden &&
        afterEsc.overflow !== 'hidden' &&
        afterEsc.focusRestored &&
        afterEsc.expandedAll &&
        viaBottomNav &&
        closedByBackdrop &&
        closedByButton.hidden &&
        closedByButton.overflow !== 'hidden' &&
        errors.length === 0,
      JSON.stringify({ uniqueClose, opened, trapped, afterEsc, viaBottomNav, closedByBackdrop, closedByButton, errors }),
    );
    await context.close();
  }

  // ---------------------------------------------------------------------------
  // 32. Bottom Navigation（手機限定）
  // ---------------------------------------------------------------------------
  {
    const problems = [];
    let detail = '';
    for (const width of [375, 430, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, hasTouch: true, isMobile: true });
      const page = await context.newPage();
      await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
      await ready(page);
      const info = await page.evaluate(() => {
        const nav = document.querySelector('nav[data-bottom-nav]');
        const rect = nav?.getBoundingClientRect();
        const style = nav ? getComputedStyle(nav) : null;
        const items = [...document.querySelectorAll('[data-bottom-nav-item]')].map((item) => {
          const r = item.getBoundingClientRect();
          return { h: Math.round(r.height), w: Math.round(r.width), current: item.getAttribute('aria-current'), text: (item.textContent ?? '').trim() };
        });
        const bodyPad = Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
        return {
          visible: (rect?.width ?? 0) > 0,
          position: style?.position,
          bottomGap: rect ? Math.round(window.innerHeight - rect.bottom) : null,
          fullWidth: rect ? Math.round(rect.width) === window.innerWidth : false,
          height: rect ? Math.round(rect.height) : 0,
          safeArea: style?.paddingBottom,
          items,
          activeCount: items.filter((item) => item.current === 'page').length,
          minTouch: items.length ? Math.min(...items.map((item) => Math.min(item.h, item.w))) : 0,
          bodyPad,
        };
      });
      if (!info.visible) problems.push(`${width}px: bottom nav 未顯示`);
      if (info.position !== 'fixed' || info.bottomGap !== 0) problems.push(`${width}px: 未固定在底部（${info.position} / ${info.bottomGap}）`);
      if (!info.fullWidth) problems.push(`${width}px: 未滿版`);
      if (info.items.length < 4 || info.items.length > 5) problems.push(`${width}px: 項目數 ${info.items.length}`);
      if (info.activeCount !== 1) problems.push(`${width}px: aria-current 數量 ${info.activeCount}`);
      if (info.minTouch < 44) problems.push(`${width}px: touch target ${info.minTouch}px`);
      if (info.bodyPad < info.height - 1) problems.push(`${width}px: body 底部保留 ${info.bodyPad} < nav ${info.height}`);
      if (width === 375) detail = JSON.stringify(info);
      await context.close();
    }
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(desktopPage);
    const desktopVisible = await isVisible(desktopPage, 'nav[data-bottom-nav]');
    if (desktopVisible) problems.push('1280px: 桌機仍顯示 bottom nav');
    await desktopContext.close();
    record(32, 'Bottom Nav：只在手機顯示、fixed 貼底滿版、safe-area、4–5 項且每項 ≥ 44px、單一 aria-current、整頁底部保留等高空間', problems.length === 0, problems.slice(0, 3).join(' | ') || detail);
  }

  // ---------------------------------------------------------------------------
  // 33. 回到頂端
  // ---------------------------------------------------------------------------
  {
    const problems = [];
    let detail = '';
    for (const [width, height, mobile] of [
      [375, 812, true],
      [1440, 900, false],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
      const page = await context.newPage();
      await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
      await ready(page);
      const atTop = await page.evaluate(() => document.querySelector('[data-back-to-top]')?.hidden ?? null);
      if (atTop !== true) problems.push(`${width}px: 頁面頂端未隱藏（hidden=${atTop}）`);
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(150);
      const shown = await page.evaluate(() => {
        const button = document.querySelector('[data-back-to-top]');
        const rect = button.getBoundingClientRect();
        return { hidden: button.hidden, label: button.getAttribute('aria-label'), size: Math.round(Math.min(rect.width, rect.height)), tag: button.tagName.toLowerCase() };
      });
      if (shown.hidden) problems.push(`${width}px: 捲動後仍隱藏`);
      if (shown.label !== '回到頂端') problems.push(`${width}px: aria-label=${shown.label}`);
      if (shown.size < 44) problems.push(`${width}px: touch target ${shown.size}px`);
      await page.locator('[data-back-to-top]').click();
      await page.waitForTimeout(800);
      const scrollY = await page.evaluate(() => Math.round(window.scrollY));
      if (scrollY > 2) problems.push(`${width}px: 點擊後未回到頂端（${scrollY}）`);
      if (width === 375) detail = JSON.stringify({ atTop, ...shown, scrollY });
      await context.close();
    }
    // prefers-reduced-motion：不使用 smooth，點擊後立即回到頂端
    const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(reducedPage);
    await reducedPage.evaluate(() => window.scrollTo(0, 1500));
    await reducedPage.waitForTimeout(150);
    await reducedPage.locator('[data-back-to-top]').click();
    const immediate = await reducedPage.evaluate(() => ({
      matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      scrollY: Math.round(window.scrollY),
    }));
    if (!immediate.matches) problems.push('reduced-motion context 未生效');
    if (immediate.scrollY > 2) problems.push(`reduced-motion 仍使用 smooth（點擊後 ${immediate.scrollY}）`);
    await reduced.close();
    record(33, '回到頂端：頂端隱藏、捲動超過門檻顯示、點擊回到頂端、prefers-reduced-motion 不使用 smooth、aria-label 與 touch target 合格（手機 + 桌機）', problems.length === 0, problems.slice(0, 3).join(' | ') || `${detail} · reduced-motion 立即回頂`);
  }

  // ---------------------------------------------------------------------------
  // 34. Global Shell 層級順序
  // ---------------------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);
    await page.locator('[data-header-menu]').click();
    const layers = await page.evaluate(() => {
      const z = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const value = Number.parseInt(getComputedStyle(element).zIndex, 10);
        return Number.isNaN(value) ? null : value;
      };
      return {
        header: z('header[data-section="header"]'),
        bottomNav: z('nav[data-bottom-nav]'),
        floating: z('[data-fa-sheet-open]'),
        sheetBackdrop: z('[data-nav-sheet]'),
        sheetPanel: z('[data-nav-sheet] [role="dialog"]'),
        // 元件不可自行寫死 z-index：檢查 shell 元素都用 syt-z-* class
        tokenised: ['header[data-section="header"]', 'nav[data-bottom-nav]', '[data-fa-sheet-open]', '[data-nav-sheet]', '[data-fa-sheet]']
          .map((selector) => document.querySelector(selector))
          .filter(Boolean)
          .every((element) => /\bsyt-z-/.test(element.className)),
      };
    });
    const ordered =
      layers.header !== null &&
      layers.bottomNav !== null &&
      layers.floating !== null &&
      layers.sheetBackdrop !== null &&
      layers.sheetPanel !== null &&
      layers.header < layers.bottomNav &&
      layers.bottomNav < layers.floating &&
      layers.floating < layers.sheetBackdrop &&
      layers.sheetBackdrop < layers.sheetPanel;
    record(34, 'Global Shell 層級一致：header < bottom nav < floating < sheet backdrop < sheet panel，且都使用共用的 syt-z-* token', ordered && layers.tokenised, JSON.stringify(layers));
    await context.close();
  }

  // ---------------------------------------------------------------------------
  // 35. 底部固定 UI 互不重疊（手機）
  // ---------------------------------------------------------------------------
  {
    const problems = [];
    let detail = '';
    for (const width of [375, 430, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, hasTouch: true, isMobile: true });
      const page = await context.newPage();
      await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
      await ready(page);
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(150);
      const boxes = await page.evaluate(() => {
        const box = (selector) => {
          const element = document.querySelector(selector);
          if (!element || element.hidden) return null;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) } : null;
        };
        return { nav: box('nav[data-bottom-nav]'), contact: box('[data-fa-sheet-open]'), backToTop: box('[data-back-to-top]') };
      });
      const overlap = (a, b) => a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      for (const [left, right] of [
        ['nav', 'contact'],
        ['nav', 'backToTop'],
        ['contact', 'backToTop'],
      ]) {
        if (overlap(boxes[left], boxes[right])) problems.push(`${width}px: ${left} × ${right} 重疊`);
      }
      for (const [name, rect] of Object.entries(boxes)) {
        if (rect && rect.bottom > 813) problems.push(`${width}px: ${name} 超出畫面底部`);
      }
      if (!boxes.nav || !boxes.contact || !boxes.backToTop) problems.push(`${width}px: 底部 UI 缺少 ${Object.entries(boxes).filter(([, v]) => !v).map(([k]) => k).join('/')}`);
      if (width === 375) detail = JSON.stringify(boxes);
      await context.close();
    }
    record(35, '手機底部固定 UI（Bottom Nav / 浮動聯絡按鈕 / 回到頂端）由下而上排列且互不重疊、不超出畫面', problems.length === 0, problems.slice(0, 3).join(' | ') || detail);
  }

  // ---------------------------------------------------------------------------
  // 36. Footer 手機 compact 版面
  // ---------------------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${verifyServer.url}/products`, { waitUntil: 'networkidle' });
    await ready(page);
    const footer = await page.evaluate(() => {
      const element = document.querySelector('footer[data-section="footer"]');
      const grid = element?.querySelector('div');
      const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
      const navs = [...(element?.querySelectorAll('nav') ?? [])].map((nav) => ({
        label: nav.getAttribute('aria-label'),
        cols: getComputedStyle(nav.querySelector('ul')).gridTemplateColumns.split(' ').filter(Boolean).length,
      }));
      const rect = element?.getBoundingClientRect();
      const bottomNav = document.querySelector('nav[data-bottom-nav]')?.getBoundingClientRect();
      const lastLink = [...(element?.querySelectorAll('a') ?? [])].pop()?.getBoundingClientRect();
      return {
        columns,
        navs,
        paddingBottom: element ? getComputedStyle(element).paddingBottom : '',
        height: rect ? Math.round(rect.height) : 0,
        lastLinkAboveNav: lastLink && bottomNav ? lastLink.bottom <= bottomNav.top + 1 : null,
      };
    });
    // 手機不可全部單欄一路垂直堆：外層 grid 必須是 2 欄
    const problems = [];
    if (footer.columns !== 2) problems.push(`外層 grid ${footer.columns} 欄（手機應為 2 欄 compact）`);
    if (!footer.navs.some((nav) => nav.cols === 2)) problems.push('沒有任何導覽群組使用雙欄');
    if (Number.parseFloat(footer.paddingBottom) < 80) problems.push(`底部保留 ${footer.paddingBottom}（浮動按鈕會蓋住連結）`);
    record(36, 'Footer 手機為 2 欄 compact 版面（品牌全寬、導覽雙欄），底部保留浮動按鈕與 Bottom Nav 空間', problems.length === 0, problems.join(' | ') || JSON.stringify(footer));
    await context.close();
  }
} catch (error) {
  record(0, 'runtime 檢查', false, error.stack?.split('\n').slice(0, 3).join(' ') ?? error.message);
} finally {
  await browser?.close().catch(() => undefined);
  await stopAll(servers);
}

// ---------------------------------------------------------------------------
// 26. RWD（預設 build，6 breakpoint）
// ---------------------------------------------------------------------------
if (args.has('--skip-rwd')) record(26, 'RWD（--skip-rwd，未執行）', true, 'skipped by flag');
else record(26, 'pnpm rwd:check marketing（375 / 430 / 768 / 1024 / 1280 / 1440）', run('pnpm rwd:check marketing'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('\n━━━━ Global UI verify（Phase 2.6C）━━━━');
for (const item of [...results].sort((a, b) => a.no - b.no)) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${String(item.no).padStart(2, ' ')}. ${item.name}${item.detail && (!item.ok || process.env.GLOBAL_UI_VERBOSE) ? `  — ${item.detail}` : ''}`);
}
const failures = results.filter((item) => !item.ok);
console.log(`\n[global-ui:verify] ${results.length - failures.length}/${results.length} checks passed`);
console.log(failures.length ? '[global-ui:verify] FAILED' : '[global-ui:verify] All global UI checks passed.');
process.exit(failures.length ? 1 : 0);
