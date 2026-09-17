// Phase 2 驗收：Auth 邊界 / Admin 與 Portal 權限保護 / Repository 切換 / Access Code 兌換 / Service role 邊界
//
// 用法：
//   pnpm phase2:auth                  全部檢查（含 phase1:structure、env leak、rwd:check）
//   pnpm phase2:auth --skip-phase1    不執行 phase1:structure（phase2:verify 已在 phase1:verify 內執行）
//   pnpm phase2:auth --skip-rwd       不執行 rwd:check（phase2:verify 最後一步執行）
//   pnpm phase2:auth --rebuild        強制以 DATA_SOURCE=mock 重新 build
//
// runtime 測試一律以 DATA_SOURCE=mock 啟動 next start（127.0.0.1、空閒 port），不連任何 Supabase。
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { DEMO_EMAILS, loginAs } from './lib/auth-session.mjs';
import { ADMIN_DIR, MARKETING_DIR, ROOT, findChrome, installSignalCleanup, startAdminServer, stopAll } from './lib/servers.mjs';

const args = new Set(process.argv.slice(2));
const APP_DIR = path.join(ADMIN_DIR, 'src', 'app');
const results = [];
const record = (group, name, ok, detail = '') => results.push({ group, name, ok: Boolean(ok), detail: String(detail ?? '') });
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const SKIP_DIRS = new Set(['node_modules', '.next', '.next-supabase', 'dist', '.astro', '.turbo', '.rwd-report']);

function walk(dir, skip = SKIP_DIRS) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, skip));
    else files.push(full);
  }
  return files;
}

const walkBuild = (dir) => walk(dir, new Set(['cache']));

function routeOf(file) {
  const segments = path
    .relative(APP_DIR, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !(segment.startsWith('(') && segment.endsWith(')')));
  return `/${segments.join('/')}`;
}

function run(command, env = {}) {
  console.log(`\n[phase2] $ ${command}`);
  return spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ...env } }).status === 0;
}

// ---------------------------------------------------------------------------
// 1–3. Guard 覆蓋（原始碼）
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = new Set(['/admin/login', '/portal/login', '/portal/redeem-code']);
const REDIRECT_ONLY = /export default function \w+\(\)\s*\{\s*redirect\('([^']+)'\);\s*\}/;
const appFiles = walk(APP_DIR).filter((file) => /[\\/](page|layout)\.tsx$/.test(file));
const adminPages = appFiles.filter((file) => file.endsWith('page.tsx') && routeOf(file).startsWith('/admin'));
const portalPages = appFiles.filter((file) => file.endsWith('page.tsx') && routeOf(file).startsWith('/portal'));
const siteExpression = (route) => 'requireSiteAccess(siteId, `' + route.replace('[siteId]', '${siteId}') + '`)';

for (const file of adminPages) {
  const route = routeOf(file);
  if (PUBLIC_ROUTES.has(route)) continue;
  const source = read(file);
  const redirectOnly = source.match(REDIRECT_ONLY);
  if (redirectOnly) {
    record('1. Admin guard', route, true, `只做 redirect → ${redirectOnly[1]}（proxy 擋未登入，目標頁有 guard）`);
    continue;
  }
  const expected = `requireAdminPage('${route}')`;
  record('1. Admin guard', route, source.includes(expected) && rel(file).includes('/(console)/'), `${expected} + (console) layout`);
}
record('1. Admin guard', 'layout admin/(console)', read(path.join(APP_DIR, 'admin', '(console)', 'layout.tsx')).includes('await requireAdminSession()'), 'requireAdminSession()');

for (const file of portalPages) {
  const route = routeOf(file);
  if (PUBLIC_ROUTES.has(route)) continue;
  const source = read(file);
  const redirectOnly = source.match(REDIRECT_ONLY);
  if (redirectOnly) {
    record('2. Portal guard', route, true, `只做 redirect → ${redirectOnly[1]}（proxy 擋未登入，目標頁有 guard）`);
    continue;
  }
  const expected = route.includes('[siteId]') ? siteExpression(route) : `requirePortalPage('${route}'`;
  record('2. Portal guard', route, source.includes(expected) && rel(file).includes('/(app)/'), `${expected} + (app) layout`);
}
record('2. Portal guard', 'layout portal/(app)', read(path.join(APP_DIR, 'portal', '(app)', 'layout.tsx')).includes('await requirePortalSession()'), 'requirePortalSession()');
const redeemPage = read(path.join(APP_DIR, 'portal', 'redeem-code', 'page.tsx'));
const redeemAction = read(path.join(APP_DIR, 'portal', 'redeem-code', 'actions.ts'));
record(
  '2. Portal guard',
  '/portal/redeem-code 可公開開啟，兌換 action 必須登入',
  redeemPage && !/requirePortal(Page|Session)/.test(redeemPage) && /getPortalContext\(\)/.test(redeemAction) && /redirectToLogin\('portal'/.test(redeemAction),
  'page 無 guard；actions.ts getPortalContext + redirectToLogin',
);
const proxySource = read(path.join(ADMIN_DIR, 'src', 'proxy.ts'));
record('2. Portal guard', 'proxy.ts matcher 涵蓋 /admin/:path* 與 /portal/:path*', proxySource.includes("'/admin/:path*'") && proxySource.includes("'/portal/:path*'"), 'apps/admin/src/proxy.ts');

const siteFiles = appFiles.filter((file) => routeOf(file).includes('[siteId]'));
for (const file of siteFiles) {
  const route = routeOf(file);
  record('3. Site access guard', `${route} (${path.basename(file)})`, read(file).includes(siteExpression(route)), siteExpression(route));
}
const guardsSource = read(path.join(ADMIN_DIR, 'src', 'lib', 'auth', 'guards.ts'));
record(
  '3. Site access guard',
  'requireSiteAccess 以 getSiteWorkspaceId + decideSiteAccess 比對 workspace',
  /getSiteWorkspaceId\(siteId\)/.test(guardsSource) && /decideSiteAccess\(/.test(guardsSource),
  'apps/admin/src/lib/auth/guards.ts',
);

// ---------------------------------------------------------------------------
// 4–5. Service role 邊界
// ---------------------------------------------------------------------------
const CODE_EXT = /\.(ts|tsx|mts|js|mjs|cjs|jsx|astro)$/;
const sourceFiles = [...walk(path.join(ROOT, 'apps')), ...walk(path.join(ROOT, 'packages'))].filter((file) => CODE_EXT.test(file));
const READS_SERVICE_ROLE = /(process\.env|import\.meta\.env)(\.|\[['"])SUPABASE_SERVICE_ROLE_KEY/;
const SERVICE_ROLE_FILE = 'apps/admin/src/lib/supabase/service-role.ts';
const readers = sourceFiles.filter((file) => READS_SERVICE_ROLE.test(read(file))).map(rel);
record('4. Service role 邊界', `只有 ${SERVICE_ROLE_FILE} 讀取 SUPABASE_SERVICE_ROLE_KEY`, readers.length === 1 && readers[0] === SERVICE_ROLE_FILE, readers.join(', ') || 'none');
record('4. Service role 邊界', 'service-role.ts 為 server-only', /^import 'server-only';/m.test(read(path.join(ROOT, SERVICE_ROLE_FILE))), SERVICE_ROLE_FILE);
const databaseServerImporters = sourceFiles.filter((file) => /from '@syt\/database\/server'/.test(read(file)));
const unsafeImporters = databaseServerImporters.filter((file) => !/^import 'server-only';/m.test(read(file))).map(rel);
record('4. Service role 邊界', '匯入 @syt/database/server 的檔案都是 server-only', unsafeImporters.length === 0, unsafeImporters.join(', ') || databaseServerImporters.map(rel).join(', '));
const clientFiles = sourceFiles.filter((file) => /^\s*['"]use client['"]/.test(read(file)));
const clientLeaks = clientFiles
  .filter((file) => /lib\/supabase\/(service-role|server)|@syt\/database\/server|lib\/auth\/(server|guards|mock-session)|lib\/config/.test(read(file)))
  .map(rel);
record('4. Service role 邊界', 'client component 不匯入 service role / server auth 模組', clientLeaks.length === 0, clientLeaks.join(', ') || `${clientFiles.length} client files checked`);
record(
  '4. Service role 邊界',
  'proxy.ts 不使用 service role、不做角色 / workspace 查詢',
  proxySource && !/service-role|SERVICE_ROLE|createServiceRoleClient|getAdminContext|getPortalContext|createRepositories|admin_profiles/.test(proxySource),
  'apps/admin/src/proxy.ts',
);
const nextConfig = read(path.join(ADMIN_DIR, 'next.config.ts'));
const exposedEnv = [...(nextConfig.match(/env:\s*\{([\s\S]*?)\}/)?.[1] ?? '').matchAll(/^\s*([A-Z0-9_]+)\s*:/gm)].map((match) => match[1]);
record('4. Service role 邊界', 'next.config env 只暴露 PUBLIC_*', exposedEnv.length > 0 && exposedEnv.every((key) => key.startsWith('PUBLIC_')), exposedEnv.join(', '));

const marketingSource = [...walk(path.join(MARKETING_DIR, 'src')), path.join(MARKETING_DIR, 'astro.config.mjs')].filter((file) => CODE_EXT.test(file));
const astroReaders = marketingSource.filter((file) => READS_SERVICE_ROLE.test(read(file)) || /SUPABASE_SERVICE_ROLE_KEY/.test(read(file))).map(rel);
record('5. Astro 不讀 service role', 'apps/marketing 原始碼沒有 SUPABASE_SERVICE_ROLE_KEY', astroReaders.length === 0, astroReaders.join(', ') || `${marketingSource.length} files`);

// ---------------------------------------------------------------------------
// 6. DATA_SOURCE 切換（Node 直接載入 data-source.ts）
// ---------------------------------------------------------------------------
const LOCAL_URL = 'http://127.0.0.1:54321';
try {
  const dataSource = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'data-source.ts')).href);
  const resolve = dataSource.resolveDataSourceConfig;
  const expectError = (name, env) => {
    try {
      resolve(env);
      record('6. DATA_SOURCE', name, false, 'did not throw');
    } catch (error) {
      record('6. DATA_SOURCE', name, error.name === 'DataSourceConfigError', error.message);
    }
  };
  record('6. DATA_SOURCE', '未設定 → mock', resolve({}).kind === 'mock');
  record('6. DATA_SOURCE', 'DATA_SOURCE=mock → mock', resolve({ DATA_SOURCE: 'mock' }).kind === 'mock');
  expectError('DATA_SOURCE=supabase 缺 URL 與 anon key → 明確錯誤', { DATA_SOURCE: 'supabase' });
  expectError('DATA_SOURCE=supabase 缺 anon key → 明確錯誤', { DATA_SOURCE: 'supabase', PUBLIC_SUPABASE_URL: LOCAL_URL });
  expectError('DATA_SOURCE=supabase 缺 URL → 明確錯誤', { DATA_SOURCE: 'supabase', PUBLIC_SUPABASE_ANON_KEY: 'local-placeholder' });
  expectError('DATA_SOURCE 打錯字 → 明確錯誤', { DATA_SOURCE: 'supabse' });
  record(
    '6. DATA_SOURCE',
    'DATA_SOURCE=supabase + 本機 URL / key → supabase',
    resolve({ DATA_SOURCE: 'supabase', PUBLIC_SUPABASE_URL: LOCAL_URL, PUBLIC_SUPABASE_ANON_KEY: 'local-placeholder' }).kind === 'supabase',
  );
} catch (error) {
  record('6. DATA_SOURCE', 'load packages/database/src/data-source.ts', false, error.message);
}
const silentFallback = [...walk(path.join(ADMIN_DIR, 'src')), ...walk(path.join(ROOT, 'packages'))]
  .filter((file) => CODE_EXT.test(file) && /DATA_SOURCE[^\n]*(\?\?|\|\|)\s*['"]mock['"]/.test(read(file)))
  .map(rel);
record('6. DATA_SOURCE', '沒有 DATA_SOURCE ?? "mock" 之類的靜默 fallback', silentFallback.length === 0, silentFallback.join(', ') || 'none');
record(
  '6. DATA_SOURCE',
  'createRepositories(supabase) 沒有使用者 client 時丟錯',
  /requires a user-scoped Supabase client/.test(read(path.join(ROOT, 'packages', 'database', 'src', 'index.ts'))),
  'packages/database/src/index.ts',
);

// ---------------------------------------------------------------------------
// 8. 兌換狀態（原始碼）
// ---------------------------------------------------------------------------
const mockRepositorySource = read(path.join(ROOT, 'packages', 'database', 'src', 'mock', 'repositories.ts'));
for (const status of ['invalid', 'expired', 'already_redeemed_by_current_user', 'already_redeemed_by_other_user', 'revoked', 'valid', 'not_authenticated']) {
  record('8. 兌換流程', `mock repository 回傳 ${status}`, mockRepositorySource.includes(`'${status}'`), 'packages/database/src/mock/repositories.ts');
}
const sharedAccessCode = read(path.join(ROOT, 'packages', 'shared', 'src', 'access-code.ts'));
record(
  '8. 兌換流程',
  'RedeemStatus 含 already_redeemed / server_error / not_authenticated，並對應 DB result',
  ["'already_redeemed'", "'server_error'", "'not_authenticated'", 'mapRedeemResultToStatus', "case 'already_exists'"].every((token) => sharedAccessCode.includes(token)),
  'packages/shared/src/access-code.ts',
);
const supabaseRepositorySource = read(path.join(ROOT, 'packages', 'database', 'src', 'supabase', 'repositories.ts'));
record(
  '8. 兌換流程',
  'supabase 模式以使用者 session 呼叫 RPC create_workspace_from_access_code',
  /rpcCreateWorkspaceFromAccessCode\(client/.test(supabaseRepositorySource) && /createWorkspaceFromAccessCode: 'create_workspace_from_access_code'/.test(read(path.join(ROOT, 'packages', 'database', 'src', 'tables.ts'))),
  'packages/database/src/supabase/{repositories,rpc}.ts',
);

// ---------------------------------------------------------------------------
// 9. 登入路由（原始碼）
// ---------------------------------------------------------------------------
for (const [route, file] of [
  ['/admin/login', path.join(APP_DIR, 'admin', 'login', 'page.tsx')],
  ['/portal/login', path.join(APP_DIR, 'portal', 'login', 'page.tsx')],
]) {
  record('9. 登入路由', `${route} page + server action`, existsSync(file) && existsSync(path.join(path.dirname(file), 'actions.ts')), rel(file));
}

// ---------------------------------------------------------------------------
// 10. 正式 Supabase URL / key / 金流密鑰掃描 + env leak
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  ['Supabase 專案網址', /https?:\/\/[a-z0-9]{20}\.supabase\.(co|in)\b/i],
  ['Supabase project ref 設定值', /project[_-]?ref["']?[ \t]*[:=][ \t]*["']?[a-z]{20}\b/i],
  ['JWT 形式的 key', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Supabase 新版 secret / publishable key', /\bsb_(secret|publishable)_[A-Za-z0-9_-]{16,}/],
  ['Stripe live key', /\b(sk|pk|rk)_live_[A-Za-z0-9]{10,}/],
  ['綠界 HashKey / HashIV 值', /(HashKey|HashIV|HASH_KEY|HASH_IV)["']?[ \t]*[:=][ \t]*["']?[A-Za-z0-9]{16}\b/],
  ['LINE Pay Channel Secret 值', /(ChannelSecret|CHANNEL_SECRET)["']?[ \t]*[:=][ \t]*["']?[a-f0-9]{32}\b/i],
  ['私鑰', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
const scanTargets = [
  ...walk(path.join(ROOT, 'apps', 'admin', 'src')),
  ...walk(path.join(ROOT, 'apps', 'marketing', 'src')),
  ...walk(path.join(ROOT, 'packages')),
  ...walk(path.join(ROOT, 'scripts')),
  ...['.env.example', 'README.md', 'package.json', 'turbo.json', 'apps/admin/next.config.ts', 'apps/marketing/astro.config.mjs', 'docs/PHASE_2_AUTH_AND_PERMISSION_NOTES.md'].map((file) =>
    path.join(ROOT, file),
  ),
].filter((file) => existsSync(file) && /\.(ts|tsx|mjs|js|json|astro|md|example|css)$/.test(file));
const secretHits = [];
for (const file of scanTargets) {
  const content = read(file);
  for (const [label, pattern] of SECRET_PATTERNS) if (pattern.test(content)) secretHits.push(`${label}: ${rel(file)}`);
}
record('10. 正式密鑰掃描', `原始碼 / 文件 / 設定（${scanTargets.length} files）無正式 Supabase URL、project ref、key、金流密鑰`, secretHits.length === 0, secretHits.join(' | ') || 'clean');

const envExampleLines = read(path.join(ROOT, '.env.example'))
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'));
const nonEmpty = envExampleLines.filter((line) => !/^[A-Z0-9_]+=$/.test(line) && line !== 'DATA_SOURCE=mock');
record('Env leak', '.env.example 只有空值（DATA_SOURCE=mock 除外）', envExampleLines.length > 0 && nonEmpty.length === 0, nonEmpty.join(', ') || `${envExampleLines.length} keys`);
record(
  'Env leak',
  '.env.example 含 Phase 2 必要 key',
  ['PUBLIC_SUPABASE_URL=', 'PUBLIC_SUPABASE_ANON_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=', 'DATA_SOURCE=mock', 'SITE_PUBLIC_URL=', 'ADMIN_PUBLIC_URL=', 'PLATFORM_SUBDOMAIN_ROOT=', 'PUBLIC_LINE_OA_URL='].every((line) => envExampleLines.includes(line)),
);
const gitignore = read(path.join(ROOT, '.gitignore'));
record('Env leak', '.gitignore 排除 .env / .env.*（保留 .env.example）', /^\.env$/m.test(gitignore) && /^\.env\.\*$/m.test(gitignore) && /^!\.env\.example$/m.test(gitignore));

// ---------------------------------------------------------------------------
// 7. Mock build + runtime 測試
// ---------------------------------------------------------------------------
const servers = [];
installSignalCleanup(servers);
let browser;

const newestMtime = (files) => files.reduce((max, file) => Math.max(max, statSync(file).mtimeMs), 0);
const buildId = path.join(ADMIN_DIR, '.next', 'BUILD_ID');
const sourceMtime = newestMtime([
  ...walk(path.join(ADMIN_DIR, 'src')),
  ...['auth', 'database', 'shared', 'ui'].flatMap((name) => walk(path.join(ROOT, 'packages', name, 'src'))),
]);
const stale = !existsSync(buildId) || statSync(buildId).mtimeMs < sourceMtime;
if (args.has('--rebuild') || stale) {
  record('7. Mock build', 'pnpm build（DATA_SOURCE=mock）', run('pnpm build', { DATA_SOURCE: 'mock' }), stale ? 'build output 缺少或比原始碼舊，重新 build' : '--rebuild');
} else {
  record('7. Mock build', 'build output 存在且比原始碼新', true, rel(buildId));
}

const clientBundle = [...walkBuild(path.join(ADMIN_DIR, '.next', 'static')), ...walkBuild(path.join(MARKETING_DIR, 'dist'))].filter((file) => /\.(js|mjs|css|html|json|txt|xml)$/.test(file));
const SERVER_ONLY_MARKERS = ['SUPABASE_SERVICE_ROLE_KEY', 'AUTH_COOKIE_SECRET', 'EC_PAY_HASH_KEY', 'EC_PAY_HASH_IV', 'LINE_PAY_CHANNEL_SECRET', 'PAYMENT_SANDBOX_SECRET', 'CLOUDFLARE_API_TOKEN', 'syt-local-mock-session-signing-key'];
for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'AUTH_COOKIE_SECRET', 'EC_PAY_HASH_KEY', 'EC_PAY_HASH_IV', 'LINE_PAY_CHANNEL_SECRET', 'PAYMENT_SANDBOX_SECRET', 'CLOUDFLARE_API_TOKEN']) {
  if ((process.env[key] ?? '').trim().length >= 8) SERVER_ONLY_MARKERS.push(process.env[key].trim());
}
const bundleLeaks = [];
for (const file of clientBundle) {
  const content = read(file);
  const marker = SERVER_ONLY_MARKERS.find((item) => content.includes(item));
  if (marker) bundleLeaks.push(`${rel(file)} (${marker.startsWith('syt-') || /^[A-Z_]+$/.test(marker) ? marker : 'env value'})`);
  for (const [label, pattern] of SECRET_PATTERNS) if (pattern.test(content)) bundleLeaks.push(`${rel(file)} (${label})`);
}
record('Env leak', `瀏覽器 bundle（admin .next/static + marketing dist，${clientBundle.length} files）無 server-only env / 簽章金鑰 / 密鑰`, clientBundle.length > 0 && bundleLeaks.length === 0, bundleLeaks.slice(0, 5).join(' | ') || 'clean');

async function attr(page, selector, name) {
  const locator = page.locator(selector);
  return (await locator.count()) ? locator.first().getAttribute(name) : null;
}

try {
  const server = await startAdminServer();
  servers.push(server);
  const base = server.url;
  record('7. Mock build', 'next start（DATA_SOURCE=mock）可啟動', true, base);

  // ---- 9. 公開頁面 ----
  for (const route of ['/admin/login', '/portal/login', '/portal/redeem-code', '/']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    const html = response.status === 200 ? await response.text() : '';
    const marker = route.endsWith('/login') ? 'data-testid="login-card"' : route === '/' ? '選擇要進入的後台' : 'data-testid="redeem-result"';
    record('9. 登入路由', `未登入 GET ${route} → 200`, response.status === 200 && html.includes(marker), `${response.status}`);
  }

  // ---- R1. 未登入：proxy 導向登入頁 ----
  const protectedRoutes = [...adminPages, ...portalPages]
    .map(routeOf)
    .filter((route) => !PUBLIC_ROUTES.has(route))
    .map((route) => route.replace('[siteId]', 'demo-seo-site'));
  for (const route of protectedRoutes) {
    const area = route.split('/')[1];
    const response = await fetch(base + route, { redirect: 'manual' });
    const location = new URL(response.headers.get('location') ?? '/', base);
    const ok =
      [307, 308].includes(response.status) &&
      location.pathname === `/${area}/login` &&
      location.searchParams.get('next') === route &&
      location.searchParams.get('error') === 'login_required';
    record(`R1. 未登入 → /${area}/login`, route, ok, `${response.status} → ${location.pathname}${location.search}`);
  }

  // ---- R2. 偽造 / 竄改 cookie：proxy 放行，但 server guard 擋下，不輸出後台內容 ----
  const forgedCookie = 'syt_mock_session=eyJzdWIiOiJtb2NrLXVzZXItb3duZXIiLCJleHAiOjQxMDI0NDQ4MDB9.forged-signature';
  for (const route of protectedRoutes) {
    const area = route.split('/')[1];
    // 追蹤轉址鏈（例如 /admin → /admin/dashboard → /admin/login），每一跳都不可輸出後台內容
    const hops = [];
    let current = route;
    let reachedLogin = false;
    let leaks = false;
    for (let hop = 0; hop < 4 && current; hop += 1) {
      const response = await fetch(base + current, { redirect: 'manual', headers: { cookie: forgedCookie } });
      const body = await response.text();
      leaks ||= body.includes('data-main') || body.includes('data-sidebar');
      const location = response.headers.get('location');
      if (!location) {
        // streaming 中的 redirect 以 meta refresh 呈現
        reachedLogin = body.includes(`/${area}/login`);
        hops.push(`${response.status}${reachedLogin ? ' (meta redirect → login)' : ''}`);
        break;
      }
      const next = new URL(location, base);
      hops.push(`${response.status} → ${next.pathname}${next.search}`);
      if (next.pathname === `/${area}/login`) {
        reachedLogin = true;
        break;
      }
      current = next.origin === new URL(base).origin ? `${next.pathname}${next.search}` : null;
    }
    record('R2. 偽造 cookie → server guard', route, reachedLogin && !leaks, `${hops.join(' ; ')}${leaks ? ' (shell rendered!)' : ''}`);
  }

  browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const sessionCache = new Map();
  const session = async (area, email) => {
    const key = `${area}:${email}`;
    if (!sessionCache.has(key)) sessionCache.set(key, await loginAs(browser, base, { area, email }));
    return sessionCache.get(key);
  };
  const visit = async (storageState, route) => {
    const context = await browser.newContext({ storageState });
    try {
      const page = await context.newPage();
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
      const url = new URL(page.url());
      return {
        path: url.pathname,
        params: url.searchParams,
        href: `${url.pathname}${url.search}`,
        shell: await page.locator('[data-main]').count(),
        forbidden: await page.locator('[data-testid="forbidden-state"]').count(),
        notice: await page.locator('[data-testid="permission-notice"]').count(),
        authError: await attr(page, '[data-testid="auth-error"]', 'data-code'),
        nav: (await page.locator('[data-sidebar] nav').count()) ? await page.locator('[data-sidebar] nav').first().innerText() : '',
      };
    } finally {
      await context.close();
    }
  };

  // ---- R3. 登入 ----
  const ownerLogin = await session('admin', DEMO_EMAILS.owner);
  record('R3. 登入流程', 'owner 從 /admin/login 登入 → /admin/dashboard', ownerLogin.finalUrl.pathname === '/admin/dashboard', ownerLogin.finalUrl.href);
  const customerAdminLogin = await loginAs(browser, base, { area: 'admin', email: DEMO_EMAILS.customer });
  record(
    'R3. 登入流程',
    '非 admin_profiles 帳號登入官方後台 → /admin/login?error=not_admin',
    customerAdminLogin.finalUrl.pathname === '/admin/login' && customerAdminLogin.finalUrl.searchParams.get('error') === 'not_admin',
    customerAdminLogin.finalUrl.href,
  );
  const customerLogin = await session('portal', DEMO_EMAILS.customer);
  record('R3. 登入流程', 'customer 從 /portal/login 登入 → /portal/dashboard', customerLogin.finalUrl.pathname === '/portal/dashboard', customerLogin.finalUrl.href);
  const nextLogin = await loginAs(browser, base, { area: 'admin', email: DEMO_EMAILS.editor, next: '/admin/cms/seo' });
  record('R3. 登入流程', '登入後導回 next（/admin/cms/seo）', nextLogin.finalUrl.pathname === '/admin/cms/seo', nextLogin.finalUrl.href);
  for (const [area, next] of [
    ['admin', '//evil.example/admin'],
    ['admin', 'https://evil.example/admin/dashboard'],
    ['portal', '/admin/dashboard'],
    ['portal', '/\\evil.example'],
  ]) {
    const login = await loginAs(browser, base, { area, email: area === 'admin' ? DEMO_EMAILS.owner : DEMO_EMAILS.customer, next });
    record('R3. 登入流程', `open redirect 防護：/${area}/login?next=${next}`, login.finalUrl.origin === new URL(base).origin && login.finalUrl.pathname === `/${area}/dashboard`, login.finalUrl.href);
  }

  // ---- R4. 角色權限 ----
  const allowed = (route, { notice } = {}) => (r) => r.path === route && r.shell > 0 && r.forbidden === 0 && (notice === undefined || r.notice === (notice ? 1 : 0));
  const adminForbidden = (r) => r.path === '/admin/dashboard' && r.params.get('error') === 'forbidden' && r.forbidden === 1;
  const siteForbidden = (r) => r.path === '/portal/dashboard' && r.params.get('error') === 'forbidden' && r.forbidden === 1;
  const noWorkspace = (r) => r.path === '/portal/redeem-code' && r.params.get('reason') === 'no_workspace';
  const ROLE_CASES = [
    ['owner', 'admin', DEMO_EMAILS.owner, '/admin/settings/users', allowed('/admin/settings/users', { notice: false }), '可管理後台帳號'],
    ['owner', 'admin', DEMO_EMAILS.owner, '/admin/commerce/payment-providers', allowed('/admin/commerce/payment-providers', { notice: false }), '可管理金流設定'],
    ['admin', 'admin', DEMO_EMAILS.admin, '/admin/access-codes', allowed('/admin/access-codes', { notice: false }), '可管理權限代碼'],
    ['admin', 'admin', DEMO_EMAILS.admin, '/admin/settings/users', allowed('/admin/settings/users', { notice: true }), '後台帳號（高風險設定）唯讀'],
    ['owner', 'admin', DEMO_EMAILS.owner, '/admin/cms/site-settings', allowed('/admin/cms/site-settings', { notice: false }), '可管理官網全站設定'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/cms/site-settings', allowed('/admin/cms/site-settings', { notice: true }), '全站設定唯讀（品牌 / 社群網址不可修改）'],
    ['author', 'admin', DEMO_EMAILS.author, '/admin/cms/site-settings', adminForbidden, '不可進入全站設定 → forbidden'],
    ['viewer', 'admin', DEMO_EMAILS.viewer, '/admin/cms/site-settings', allowed('/admin/cms/site-settings', { notice: true }), '全站設定唯讀'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/cms/seo', allowed('/admin/cms/seo', { notice: false }), '可管理 CMS SEO'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/customer-sites/projects', allowed('/admin/customer-sites/projects', { notice: true }), '可查看客戶網站內容'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/seo-generator/projects', allowed('/admin/seo-generator/projects'), '可使用文章生產器'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/access-codes', adminForbidden, '不可進入權限代碼 → forbidden'],
    ['editor', 'admin', DEMO_EMAILS.editor, '/admin/commerce/orders', adminForbidden, '不可進入訂單 → forbidden'],
    ['author', 'admin', DEMO_EMAILS.author, '/admin/seo-generator/projects', allowed('/admin/seo-generator/projects'), '可使用文章生產器'],
    ['author', 'admin', DEMO_EMAILS.author, '/admin/cms/assets', allowed('/admin/cms/assets'), '可上傳內容素材'],
    ['author', 'admin', DEMO_EMAILS.author, '/admin/cms/seo', adminForbidden, '不可管理 SEO 設定 → forbidden'],
    ['author', 'admin', DEMO_EMAILS.author, '/admin/customer-sites/projects', adminForbidden, '不可進入客戶網站 → forbidden'],
    ['viewer', 'admin', DEMO_EMAILS.viewer, '/admin/dashboard', allowed('/admin/dashboard', { notice: true }), '儀表板唯讀'],
    ['viewer', 'admin', DEMO_EMAILS.viewer, '/admin/cms/navigation', allowed('/admin/cms/navigation', { notice: true }), '指定資料唯讀'],
    ['viewer', 'admin', DEMO_EMAILS.viewer, '/admin/settings', adminForbidden, '不可進入設定 → forbidden'],
    ['viewer', 'admin', DEMO_EMAILS.viewer, '/admin/commerce/payment-providers', adminForbidden, '不可進入金流設定 → forbidden'],
    ['customer', 'portal', DEMO_EMAILS.customer, '/admin/dashboard', (r) => r.path === '/admin/login' && r.authError === 'not_admin', '客戶帳號進入官方後台 → not_admin'],
    ['customer', 'portal', DEMO_EMAILS.customer, '/portal/sites/demo-seo-site/domain', allowed('/portal/sites/demo-seo-site/domain'), '自己的網站可進入'],
    ['customer', 'portal', DEMO_EMAILS.customer, '/portal/sites/other-workspace-site', siteForbidden, '其他 workspace 的網站 → forbidden'],
    ['customer', 'portal', DEMO_EMAILS.customer, '/portal/sites/other-workspace-site/content', siteForbidden, '其他 workspace 的網站子頁 → forbidden'],
    ['customer', 'portal', DEMO_EMAILS.customer, '/portal/sites/not-exist-site/seo', siteForbidden, '不存在的網站 → forbidden（不透露是否存在）'],
    ['other-customer', 'portal', DEMO_EMAILS.otherCustomer, '/portal/sites/demo-seo-site', siteForbidden, '看不到 customer 的網站'],
    ['other-customer', 'portal', DEMO_EMAILS.otherCustomer, '/portal/sites/other-workspace-site/forms', allowed('/portal/sites/other-workspace-site/forms'), '自己的網站可進入'],
    ['outsider', 'portal', DEMO_EMAILS.outsider, '/portal/dashboard', noWorkspace, '沒有 workspace → 兌換代碼頁'],
    ['outsider', 'portal', DEMO_EMAILS.outsider, '/portal/sites/demo-seo-site', noWorkspace, '沒有 workspace 不可進入網站'],
    ['outsider', 'portal', DEMO_EMAILS.outsider, '/portal/support', allowed('/portal/support'), '客服頁不需 workspace'],
    ['owner', 'admin', DEMO_EMAILS.owner, '/portal/sites/demo-seo-site', noWorkspace, '森映 owner 在客戶後台看不到客戶工作區'],
  ];
  for (const [label, area, email, route, expectation, description] of ROLE_CASES) {
    const { storageState } = await session(area, email);
    const result = await visit(storageState, route);
    record(`R4. 角色權限（${label}）`, `${route}：${description}`, expectation(result), `→ ${result.href} shell=${result.shell} forbidden=${result.forbidden} notice=${result.notice} authError=${result.authError ?? '-'}`);
  }

  const viewerDashboard = await visit((await session('admin', DEMO_EMAILS.viewer)).storageState, '/admin/dashboard');
  record('R4. 角色權限（viewer）', '選單依角色過濾（無商務 / 權限代碼 / 設定）', viewerDashboard.nav.includes('儀表板') && !/商品方案|全部代碼|後台帳號/.test(viewerDashboard.nav), viewerDashboard.nav.replace(/\s+/g, ' ').slice(0, 120));
  const ownerDashboard = await visit(ownerLogin.storageState, '/admin/dashboard');
  record('R4. 角色權限（owner）', '選單顯示全部模組', ['商品方案', '全部代碼', '後台帳號', '文章專案'].every((label) => ownerDashboard.nav.includes(label)), ownerDashboard.nav.replace(/\s+/g, ' ').slice(0, 120));

  // ---- R5. 登出 / 竄改 cookie ----
  {
    const context = await browser.newContext({ storageState: ownerLogin.storageState });
    const page = await context.newPage();
    await page.goto(`${base}/admin/dashboard`, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL((url) => url.pathname === '/admin/login', { timeout: 60000 }), page.locator('[data-testid="logout-button"]').click()]);
    const afterLogout = new URL(page.url());
    const cookies = await context.cookies();
    await page.goto(`${base}/admin/dashboard`, { waitUntil: 'networkidle' });
    const revisit = new URL(page.url());
    record(
      'R5. 登出 / cookie',
      '登出 → /admin/login?error=logged_out，cookie 清除，再進後台被導回登入',
      afterLogout.searchParams.get('error') === 'logged_out' && !cookies.some((cookie) => cookie.name === 'syt_mock_session') && revisit.pathname === '/admin/login',
      `${afterLogout.pathname}${afterLogout.search} → revisit ${revisit.pathname}${revisit.search}`,
    );
    await context.close();
  }
  {
    const context = await browser.newContext();
    const [name, value] = forgedCookie.split('=');
    await context.addCookies([{ name, value, url: base }]);
    const page = await context.newPage();
    for (const [route, loginPath] of [
      ['/admin/dashboard', '/admin/login'],
      ['/portal/sites/demo-seo-site', '/portal/login'],
    ]) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const url = new URL(page.url());
      record('R5. 登出 / cookie', `竄改簽章的 cookie 進入 ${route} → ${loginPath}`, url.pathname === loginPath && (await page.locator('[data-main]').count()) === 0, `${url.pathname}${url.search}`);
    }
    const ownerCookie = ownerLogin.storageState.cookies.find((cookie) => cookie.name === 'syt_mock_session');
    record('R5. 登出 / cookie', 'session cookie 為 httpOnly + SameSite=Lax', ownerCookie?.httpOnly === true && ownerCookie?.sameSite === 'Lax', JSON.stringify({ httpOnly: ownerCookie?.httpOnly, sameSite: ownerCookie?.sameSite }));
    await context.close();
  }

  // ---- R6. 兌換流程（mock） ----
  const redeem = async (storageState, code) => {
    const context = await browser.newContext({ storageState });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/portal/redeem-code`, { waitUntil: 'networkidle' });
      await page.locator('#access-code').fill(code);
      const moved = page.waitForURL((url) => url.pathname !== '/portal/redeem-code' || url.searchParams.has('result'), { timeout: 30000 }).catch(() => null);
      const shown = page.locator('[data-testid="redeem-result"]').first().waitFor({ timeout: 30000 }).catch(() => null);
      await page.locator('[data-testid="redeem-submit"]').click();
      await Promise.race([moved, shown]);
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="redeem-result"]').first().waitFor({ timeout: 30000 });
      const url = new URL(page.url());
      return { path: url.pathname, params: url.searchParams, href: `${url.pathname}${url.search}`, status: await attr(page, '[data-testid="redeem-result"]', 'data-status') };
    } finally {
      await context.close();
    }
  };
  const customerState = customerLogin.storageState;
  const REDEEM_CASES = [
    ['格式錯誤 ABC-123 → invalid', customerState, 'ABC-123', (r) => r.status === 'invalid' && r.path === '/portal/redeem-code'],
    ['不存在的代碼 → invalid', customerState, 'SYT-SEO-2026-ZZZZZZ', (r) => r.status === 'invalid'],
    ['已過期 → expired', customerState, 'SYT-DM-2026-H4M8T2', (r) => r.status === 'expired'],
    ['已撤銷 → revoked', customerState, 'SYT-AI-2026-N3Q8Z5', (r) => r.status === 'revoked'],
    ['被其他帳號兌換 → already_redeemed_by_other_user', customerState, 'SYT-SEO-2026-R7T4W2', (r) => r.status === 'already_redeemed_by_other_user'],
    ['本人已兌換 → already_redeemed_by_current_user → /portal/sites/demo-landing-page', customerState, 'SYT-LP-2026-P7X2M4', (r) => r.status === 'already_redeemed_by_current_user' && r.path === '/portal/sites/demo-landing-page'],
    ['成功（小寫輸入）→ valid → /portal/sites/demo-seo-site', customerState, 'syt-seo-2026-a8k3q9', (r) => r.status === 'valid' && r.path === '/portal/sites/demo-seo-site'],
    ['未開通帳號兌換成功 → valid（尚無網站，停在兌換頁顯示結果）', (await session('portal', DEMO_EMAILS.outsider)).storageState, 'SYT-SEO-2026-A8K3Q9', (r) => r.status === 'valid' && r.path === '/portal/redeem-code' && r.params.get('result') === 'valid'],
  ];
  for (const [name, storageState, code, expectation] of REDEEM_CASES) {
    try {
      const result = await redeem(storageState, code);
      record('R6. 兌換流程（mock）', name, expectation(result), `→ ${result.href} status=${result.status}`);
    } catch (error) {
      record('R6. 兌換流程（mock）', name, false, error.message.split('\n')[0]);
    }
  }
  {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`${base}/portal/redeem-code`, { waitUntil: 'networkidle' });
      const anonStatus = await attr(page, '[data-testid="redeem-result"]', 'data-status');
      await page.locator('#access-code').fill('SYT-SEO-2026-A8K3Q9');
      await Promise.all([page.waitForURL((url) => url.pathname === '/portal/login', { timeout: 30000 }), page.locator('[data-testid="redeem-submit"]').click()]);
      const loginUrl = new URL(page.url());
      record(
        'R6. 兌換流程（mock）',
        '未登入送出 → not_authenticated → /portal/login?next=/portal/redeem-code',
        anonStatus === 'not_authenticated' && loginUrl.searchParams.get('next') === '/portal/redeem-code' && loginUrl.searchParams.get('error') === 'login_required',
        `anon=${anonStatus} → ${loginUrl.pathname}${loginUrl.search}`,
      );
      await page.waitForLoadState('networkidle');
      await Promise.all([
        page.waitForURL((url) => url.pathname === '/portal/redeem-code', { timeout: 30000 }),
        page.locator(`[data-testid="demo-login"][value="${DEMO_EMAILS.customer}"]`).click(),
      ]);
      await page.waitForLoadState('networkidle');
      const prefilled = await page.locator('#access-code').inputValue();
      record('R6. 兌換流程（mock）', '登入後回到兌換頁並帶回剛才的代碼', prefilled === 'SYT-SEO-2026-A8K3Q9', `value=${prefilled}`);
      await Promise.all([page.waitForURL((url) => url.pathname.startsWith('/portal/sites/'), { timeout: 30000 }), page.locator('[data-testid="redeem-submit"]').click()]);
      await page.locator('[data-testid="redeem-result"]').first().waitFor({ timeout: 30000 });
      const finalUrl = new URL(page.url());
      record(
        'R6. 兌換流程（mock）',
        '繼續兌換成功 → /portal/sites/[siteId]',
        finalUrl.pathname === '/portal/sites/demo-seo-site' && (await attr(page, '[data-testid="redeem-result"]', 'data-status')) === 'valid',
        `${finalUrl.pathname}${finalUrl.search}`,
      );
    } catch (error) {
      record('R6. 兌換流程（mock）', '未登入 → 登入 → 回到兌換頁 → 成功', false, error.message.split('\n')[0]);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  browser = undefined;
  await stopAll(servers);

  // ---- R7. DATA_SOURCE=supabase 缺 env：runtime 明確失敗 ----
  try {
    const misconfigured = await startAdminServer({
      env: { DATA_SOURCE: 'supabase', PUBLIC_SUPABASE_URL: '', PUBLIC_SUPABASE_ANON_KEY: '' },
      expectServerError: true,
    });
    servers.push(misconfigured);
    const responses = [];
    for (const route of ['/admin/login', '/portal/login', '/portal/redeem-code', '/admin/dashboard', '/portal/sites/demo-seo-site']) {
      const response = await fetch(misconfigured.url + route, { redirect: 'manual', headers: { cookie: forgedCookie } });
      const body = await response.text();
      responses.push({
        route,
        status: response.status,
        location: response.headers.get('location'),
        servedMock: body.includes('data-testid="demo-login"') || body.includes('data-main') || body.includes('Mock 模式'),
        configErrorUi: body.includes('DATA_SOURCE=supabase requires') || body.includes('data-code="config_error"'),
      });
    }
    const logText = misconfigured.logs.join('');
    // 兩種都算「明確失敗」：(a) 每個請求 5xx 且 log 有 DataSourceConfigError；(b) 頁面顯示 config_error。任何一頁回傳 mock 內容都失敗。
    const failsWith5xx = responses.every((item) => item.status >= 500) && /DataSourceConfigError[\s\S]*DATA_SOURCE=supabase requires/.test(logText);
    const failsWithUi = responses.every((item) => item.configErrorUi || (item.location ?? '').includes('error=config_error'));
    record(
      '6. DATA_SOURCE',
      'runtime：DATA_SOURCE=supabase 缺 env → 明確失敗，不改用 mock',
      responses.every((item) => !item.servedMock) && (failsWith5xx || failsWithUi),
      `${failsWith5xx ? 'all requests 5xx + DataSourceConfigError in server log' : failsWithUi ? 'config_error UI' : 'unexpected'}: ${responses.map((item) => `${item.route}=${item.status}`).join(', ')}`,
    );
  } catch (error) {
    record('6. DATA_SOURCE', 'runtime：DATA_SOURCE=supabase 缺 env → 伺服器拒絕啟動', /DATA_SOURCE=supabase requires/.test(error.message), error.message.split('\n')[0]);
  } finally {
    await stopAll(servers);
  }
} catch (error) {
  record('Runtime', 'runtime 測試執行', false, error.stack?.split('\n').slice(0, 3).join(' ') ?? error.message);
} finally {
  await browser?.close().catch(() => undefined);
  await stopAll(servers);
}

// ---------------------------------------------------------------------------
// Phase 1 結構 + RWD
// ---------------------------------------------------------------------------
if (!args.has('--skip-phase1')) record('Phase 1', 'pnpm phase1:structure', run('pnpm phase1:structure'));
if (!args.has('--skip-rwd')) record('RWD', 'pnpm rwd:check（含登入、權限錯誤、兌換結果頁）', run('pnpm rwd:check'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const groups = [...new Set(results.map((item) => item.group))];
console.log('\n━━━━ Phase 2 auth check ━━━━');
for (const group of groups) {
  const items = results.filter((item) => item.group === group);
  const failed = items.filter((item) => !item.ok);
  console.log(`\n${failed.length ? '✗' : '✓'} ${group}  (${items.length - failed.length}/${items.length})`);
  for (const item of items) {
    if (!item.ok || process.env.PHASE2_VERBOSE) console.log(`  ${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`);
  }
}
const failures = results.filter((item) => !item.ok);
console.log(`\n[phase2:auth] ${results.length - failures.length}/${results.length} checks passed`);
console.log(failures.length ? '[phase2:auth] FAILED' : '[phase2:auth] All Phase 2 auth checks passed.');
process.exit(failures.length ? 1 : 0);
