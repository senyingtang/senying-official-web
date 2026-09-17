// Phase 2.6C 全站 UI 驗收：SEN YING 品牌、Floating Actions、購物車 Badge、手機 Bottom Sheet、Admin 全站設定
//
// 做法：
//   - 預設 build（mock 預設設定：購物車捷徑關閉、未提供網址的社群不顯示）
//   - 驗收 build（SITE_SETTINGS_MOCK_PRESET=verification：example.com 網址、購物車捷徑開啟）複製到 .global-ui-report/verification-dist
//     驗收 build 只用於本腳本，完成後重新 build 預設版本，apps/marketing/dist 永遠是預設設定
//   - 以本機 Chrome 檢查收合 / 展開、aria、localStorage、badge、bottom sheet、遮擋
//
// 用法：pnpm global-ui:verify [--skip-build] [--skip-rwd]
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
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

// fs.cpSync 在此 Windows / OneDrive 路徑會讓 Node 直接結束（exit 127、無錯誤訊息），改用逐檔複製
function copyDir(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFileSync(from, to);
  }
}
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
  const steps = [];
  if (!args.has('--skip-build')) steps.push(['pnpm build', run('pnpm build')]);
  const presetBuilt = run('pnpm --filter @syt/marketing build', { SITE_SETTINGS_MOCK_PRESET: 'verification' });
  steps.push(['marketing build（verification preset）', presetBuilt]);
  if (presetBuilt) {
    rmSync(VERIFY_DIST, { recursive: true, force: true });
    copyDir(DIST, VERIFY_DIST);
  }
  steps.push(['marketing build（預設設定，還原 dist）', run('pnpm --filter @syt/marketing build', { SITE_SETTINGS_MOCK_PRESET: '' })]);
  record(27, 'build 通過（預設 build + 驗收 build）', steps.every(([, ok]) => ok) && existsSync(path.join(VERIFY_DIST, 'index.html')), steps.map(([name, ok]) => `${ok ? '✓' : '✗'} ${name}`).join(' / '));
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
          const floating = ['[data-fa-expanded]', '[data-fa-compact]', '[data-fa-sheet-open]']
            .map((selector) => document.querySelector(selector))
            .filter((element) => element && element.getBoundingClientRect().width > 0);
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
                found.push(`${target.tagName.toLowerCase()}「${(target.textContent ?? '').trim().slice(0, 12)}」× ${element.getAttribute('data-fa-expanded') !== null ? 'rail' : element.hasAttribute('data-fa-compact') ? 'compact' : 'mobile-button'}`);
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
    record(28, '浮動快捷列不遮擋 Hero CTA / Final CTA / Checkout 摘要 / 產品卡 / 比較表 / Header / Footer，無水平捲軸（6 個寬度）', problems.length === 0, problems.slice(0, 4).join(' || ') || `${WIDTHS.join(' / ')} × 5 頁`);
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
