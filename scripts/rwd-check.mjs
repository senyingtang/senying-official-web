// RWD 自動檢查（一條指令完成）：
//   1. build output 不存在時自動 pnpm build
//   2. 自動啟動前台（Astro static build）與後台（next start，DATA_SOURCE=mock），port 被占用時自動換空閒 port
//   3. 後台以 mock 示範帳號登入（owner / viewer / customer / outsider），檢查受保護頁面、登入頁、權限錯誤頁與兌換結果頁
//   4. 以本機 Chrome 檢查所有頁面在 375 / 430 / 768 / 1024 / 1280 / 1440px：
//      水平捲軸、元素超出視窗、側欄遮住內容、手機選單展開跑版、Modal 超出畫面、圖片變形、runtime / hydration 錯誤，
//      以及「最終網址必須是預期頁面」（被導回登入頁或 forbidden 視為失敗，避免檢查到錯的頁面）
//   5. 結束（含失敗、Ctrl+C）時自動關閉服務
//
// 用法：
//   pnpm rwd:check                 前台 + 後台
//   pnpm rwd:check marketing       只檢查前台
//   pnpm rwd:check admin           只檢查後台
//   pnpm rwd:check --rebuild       強制重新 build
//   MARKETING_URL / ADMIN_URL      指定既有服務時，不自動啟動該服務（ADMIN_URL 必須是 DATA_SOURCE=mock）
//   CHROME_PATH / RWD_CONCURRENCY  自訂 Chrome 路徑 / 並行數（預設 3）
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { DEMO_EMAILS, loginAs } from './lib/auth-session.mjs';
import { ROOT, ensureBuilt, findChrome, installSignalCleanup, startAdminServer, startMarketingServer, stopAll } from './lib/servers.mjs';

const WIDTHS = [375, 430, 768, 1024, 1280, 1440];
const VIEWPORT_HEIGHT = 900;
const args = process.argv.slice(2);
const onlyApp = args.find((arg) => arg === 'marketing' || arg === 'admin');
const concurrency = Math.max(1, Number(process.env.RWD_CONCURRENCY ?? 3));

const marketingPaths = [
  '/', '/products', '/products/seo-website', '/products/landing-page', '/products/landing-page/group-buy-promo',
  '/products/landing-page/event-registration', '/products/landing-page/course-enrollment', '/products/landing-page/booking-form',
  '/products/ecommerce-website', '/products/promo-page-design', '/products/seo-article-generator', '/solutions', '/cases', '/blog',
  '/about', '/contact', '/checkout', '/legal/terms', '/legal/privacy',
];

/** 登入帳號：area 決定從哪個登入頁登入，home 為登入後應該到達的頁面 */
const ACCOUNTS = {
  owner: { area: 'admin', email: DEMO_EMAILS.owner, home: '/admin/dashboard' },
  viewer: { area: 'admin', email: DEMO_EMAILS.viewer, home: '/admin/dashboard' },
  customer: { area: 'portal', email: DEMO_EMAILS.customer, home: '/portal/dashboard' },
  outsider: { area: 'portal', email: DEMO_EMAILS.outsider, home: '/portal/redeem-code' },
};

const adminConsolePaths = [
  '/admin/dashboard', '/admin/cms', '/admin/cms/pages', '/admin/cms/navigation', '/admin/cms/assets', '/admin/cms/seo', '/admin/cms/site-settings', '/admin/commerce',
  '/admin/commerce/products', '/admin/commerce/prices', '/admin/commerce/orders', '/admin/commerce/payment-providers', '/admin/commerce/subscriptions',
  '/admin/access-codes', '/admin/access-codes/generated', '/admin/access-codes/redeemed', '/admin/templates', '/admin/templates/list',
  '/admin/templates/licenses', '/admin/customer-sites', '/admin/customer-sites/projects', '/admin/customer-sites/domains',
  '/admin/customer-sites/deployments', '/admin/seo-generator', '/admin/seo-generator/projects', '/admin/seo-generator/usage', '/admin/settings',
  '/admin/settings/users', '/admin/settings/roles', '/admin/settings/audit-logs',
];

const portalAppPaths = [
  '/portal/dashboard', '/portal/sites', '/portal/sites/new', '/portal/sites/demo-seo-site', '/portal/sites/demo-seo-site/content',
  '/portal/sites/demo-seo-site/appearance', '/portal/sites/demo-seo-site/seo', '/portal/sites/demo-seo-site/forms',
  '/portal/sites/demo-seo-site/domain', '/portal/sites/demo-seo-site/preview', '/portal/sites/demo-seo-site/publish', '/portal/billing',
  '/portal/templates', '/portal/support',
];

const adminTargets = [
  // 公開頁（未登入）：入口、登入頁、登入錯誤訊息、兌換頁（未登入狀態）
  ...[
    '/', '/admin/login', '/portal/login', '/portal/redeem-code', '/admin/login?error=not_admin', '/admin/login?error=logged_out',
    '/admin/login?next=%2Fadmin%2Fdashboard&error=login_required', '/portal/login?next=%2Fportal%2Fredeem-code&error=login_required',
  ].map((p) => ({ path: p, as: null })),
  // 官方後台（owner）
  { path: '/admin', as: 'owner', expect: '/admin/dashboard' },
  ...adminConsolePaths.map((p) => ({ path: p, as: 'owner' })),
  { path: '/admin/dashboard?error=forbidden', as: 'owner' },
  // 唯讀提示（viewer）
  { path: '/admin/dashboard', as: 'viewer' },
  { path: '/admin/cms/navigation', as: 'viewer' },
  // 客戶後台（customer）
  { path: '/portal', as: 'customer', expect: '/portal/dashboard' },
  ...portalAppPaths.map((p) => ({ path: p, as: 'customer' })),
  { path: '/portal/dashboard?error=forbidden', as: 'customer' },
  { path: '/portal/redeem-code', as: 'customer' },
  ...['valid', 'invalid', 'expired', 'already_redeemed_by_other_user', 'revoked', 'rate_limited', 'server_error'].map((status) => ({
    path: `/portal/redeem-code?result=${status}`,
    as: 'customer',
  })),
  { path: '/portal/sites/demo-seo-site?redeem=valid', as: 'customer' },
  // 尚未開通工作區（outsider）
  { path: '/portal/redeem-code?reason=no_workspace', as: 'outsider' },
  { path: '/portal/support', as: 'outsider' },
];

async function inspect(page, width) {
  return page.evaluate((viewportWidth) => {
    const doc = document.documentElement;
    const problems = [];
    const horizontal = Math.max(doc.scrollWidth, document.body.scrollWidth) - viewportWidth;
    if (horizontal > 1) problems.push(`horizontal scroll ${horizontal}px`);

    // 元素超出視窗（排除位於 overflow 捲動 / 裁切容器內的元素與 sr-only）
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
      let clipped = false;
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) {
          clipped = true;
          break;
        }
      }
      if (clipped) continue;
      const cls = typeof el.className === 'string' ? el.className : '';
      if (cls.includes('sr-only')) continue;
      offenders.push(`${el.tagName.toLowerCase()}.${cls.split(' ').slice(0, 3).join('.')} [${Math.round(rect.left)}→${Math.round(rect.right)}]`);
      if (offenders.length >= 3) break;
    }
    if (offenders.length) problems.push(`overflowing elements: ${offenders.join(' | ')}`);

    // 側欄不可遮住主內容
    const sidebar = document.querySelector('[data-sidebar]');
    const main = document.querySelector('[data-main]');
    if (sidebar && main && getComputedStyle(sidebar).display !== 'none') {
      const sidebarRect = sidebar.getBoundingClientRect();
      const content = main.querySelector('main')?.getBoundingClientRect();
      if (content && content.left < sidebarRect.right - 1) problems.push(`sidebar covers content (${Math.round(sidebarRect.right)} > ${Math.round(content.left)})`);
      if (main.getBoundingClientRect().width < 200) problems.push('main column too narrow');
    }

    // 登入卡 / 錯誤訊息 / 兌換結果不可被擠壓（寬度過窄或內容溢出卡片）
    for (const selector of ['[data-testid="login-card"]', '[data-testid="auth-error"]', '[data-testid="forbidden-state"]', '[data-testid="redeem-result"]', '[data-testid="permission-notice"]']) {
      for (const el of document.querySelectorAll(selector)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.width < Math.min(260, viewportWidth - 40)) problems.push(`${selector} squeezed (${Math.round(rect.width)}px)`);
        if (el.scrollWidth > el.clientWidth + 1) problems.push(`${selector} content overflows (${el.scrollWidth} > ${el.clientWidth})`);
      }
    }

    // 圖片變形
    for (const img of document.querySelectorAll('img')) {
      if (!img.naturalWidth || !img.clientWidth) continue;
      const style = getComputedStyle(img);
      if (style.objectFit === 'cover' || style.objectFit === 'contain') continue;
      const ratio = img.clientWidth / img.clientHeight / (img.naturalWidth / img.naturalHeight);
      if (ratio < 0.95 || ratio > 1.05) problems.push(`distorted image ${img.src}`);
    }
    return problems;
  }, width);
}

async function checkPage(browser, target, width, sessions) {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1,
    storageState: target.as ? sessions[target.as] : undefined,
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() !== 'error' && !/hydrat/i.test(text)) return;
    const sourceUrl = message.location()?.url ?? '';
    if (/Failed to load resource/.test(text) && /\/favicon\.ico$/.test(sourceUrl)) return; // 後台尚無 favicon
    runtimeErrors.push(`console.${message.type()}: ${text.slice(0, 200)} ${sourceUrl}`);
  });

  const problems = [];
  try {
    const response = await page.goto(target.url, { waitUntil: 'networkidle', timeout: 60000 });
    const status = response?.status() ?? 0;
    if (status >= 400) problems.push(`HTTP ${status}`);

    const expected = new URL(target.expect ?? target.path, target.url);
    const actual = new URL(page.url());
    if (`${actual.pathname}${actual.search}` !== `${expected.pathname}${expected.search}`) {
      problems.push(`unexpected final URL ${actual.pathname}${actual.search} (expected ${expected.pathname}${expected.search})`);
    }
    problems.push(...(await inspect(page, width)));

    if (width < 1024) {
      const trigger = target.app === 'marketing' ? page.locator('header summary').first() : page.getByRole('button', { name: '開啟選單' });
      if (await trigger.count()) {
        await trigger.click();
        await page.waitForTimeout(150);
        problems.push(...(await inspect(page, width)).map((problem) => `[menu open] ${problem}`));
      }
    }

    if (target.app === 'admin' && actual.pathname === '/admin/access-codes') {
      await page.reload({ waitUntil: 'networkidle' });
      const button = page.locator('[data-testid="open-revoke-modal"]:not([disabled])').first();
      if (!(await button.count())) {
        problems.push('revoke modal trigger not found');
      } else {
        await button.click();
        const box = await page.getByRole('dialog').boundingBox();
        if (!box || box.x < 0 || box.y < 0 || box.x + box.width > width + 1 || box.y + box.height > VIEWPORT_HEIGHT + 1) {
          problems.push(`modal outside viewport ${JSON.stringify(box)}`);
        }
      }
    }
  } catch (error) {
    problems.push(`navigation failed: ${error.message}`);
  } finally {
    await context.close();
  }
  problems.push(...runtimeErrors);
  return problems;
}

async function runPool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

const servers = [];
installSignalCleanup(servers);
let exitCode = 0;
let browser;
let adminServer;

try {
  const wantMarketing = onlyApp !== 'admin';
  const wantAdmin = onlyApp !== 'marketing';
  let marketingUrl = process.env.MARKETING_URL?.replace(/\/+$/, '');
  let adminUrl = process.env.ADMIN_URL?.replace(/\/+$/, '');

  ensureBuilt([...(wantMarketing && !marketingUrl ? ['marketing'] : []), ...(wantAdmin && !adminUrl ? ['admin'] : [])], {
    force: args.includes('--rebuild'),
  });

  if (wantMarketing && !marketingUrl) {
    const server = await startMarketingServer();
    servers.push(server);
    marketingUrl = server.url;
    console.log(`[rwd] started ${server.name} at ${server.url}`);
  }
  if (wantAdmin && !adminUrl) {
    const server = await startAdminServer();
    servers.push(server);
    adminServer = server;
    adminUrl = server.url;
    console.log(`[rwd] started ${server.name} at ${server.url} (DATA_SOURCE=mock)`);
  }

  browser = await chromium.launch({ executablePath: findChrome(), headless: true });

  const sessions = {};
  if (wantAdmin) {
    for (const [key, account] of Object.entries(ACCOUNTS)) {
      const { storageState, finalUrl } = await loginAs(browser, adminUrl, account);
      if (finalUrl.pathname !== account.home) throw new Error(`login as ${account.email} ended at ${finalUrl.pathname}${finalUrl.search} (expected ${account.home})`);
      sessions[key] = storageState;
      console.log(`[rwd] logged in as ${account.email}`);
    }
  }

  const targets = [
    ...(wantMarketing ? marketingPaths.map((p) => ({ app: 'marketing', path: p, as: null, url: marketingUrl + p })) : []),
    ...(wantAdmin ? adminTargets.map((target) => ({ app: 'admin', ...target, url: adminUrl + target.path })) : []),
  ];
  const tasks = targets.flatMap((target) => WIDTHS.map((width) => ({ target, width })));

  const failures = [];
  await runPool(tasks, concurrency, async ({ target, width }) => {
    const problems = await checkPage(browser, target, width, sessions);
    if (problems.length) failures.push({ url: target.url, as: target.as ?? 'anonymous', width, problems });
  });

  const reportName = `report-${onlyApp ?? 'all'}.json`;
  mkdirSync(path.join(ROOT, '.rwd-report'), { recursive: true });
  writeFileSync(
    path.join(ROOT, '.rwd-report', reportName),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        widths: WIDTHS,
        checks: tasks.length,
        pages: targets.map((target) => ({ app: target.app, path: target.path, as: target.as ?? 'anonymous' })),
        failures,
      },
      null,
      2,
    ),
  );

  console.log(`[rwd] checks: ${tasks.length} (${targets.length} pages × ${WIDTHS.length} widths) → .rwd-report/${reportName}`);
  if (failures.length) {
    exitCode = 1;
    console.log(`[rwd] FAILED: ${failures.length}`);
    for (const failure of failures.slice(0, 40)) console.log(`- ${failure.width}px ${failure.url} [${failure.as}]\n    ${failure.problems.join('\n    ')}`);
    if (adminServer && !adminServer.isAlive()) {
      const { code, signal } = adminServer.exitInfo();
      console.log(`[rwd] admin server exited during the run (code=${code}, signal=${signal}). Last log:\n${adminServer.logs.join('').slice(-3000)}`);
    }
  } else {
    console.log('[rwd] All RWD checks passed.');
  }
} catch (error) {
  exitCode = 1;
  console.error(`[rwd] error: ${error.message}`);
} finally {
  await browser?.close().catch(() => undefined);
  await stopAll(servers);
  console.log('[rwd] servers stopped.');
}

process.exit(exitCode);
