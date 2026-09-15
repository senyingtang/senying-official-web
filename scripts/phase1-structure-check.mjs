// Phase 1 正式結構驗收（Node.js，避免 PowerShell 把 [siteId] 當成 wildcard）
//
// 驗證方式：
//   1. Source route definition：依 Astro / Next.js 真實路由規則解析原始檔
//      - Astro：支援 foo.astro、foo/index.astro、[param].astro、[...rest].astro（動態路由需有 getStaticPaths，
//        且參數值必須在該檔或其相對 import 的模組中宣告）
//      - Next.js App Router：支援 route groups (group)、平行路由 @slot、private _folder、動態 [param]
//   2. Build output：Astro dist/*.html、Next.js .next/app-path-routes-manifest.json
//      - 預設：有 build output 就嚴格比對；沒有則標示「尚未建置」
//      - --require-build：build output 缺少或比原始碼舊時直接 FAIL
//
// 用法：node scripts/phase1-structure-check.mjs [--require-build]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// PHASE1_ROOT：只供腳本自我測試（fixture）使用，預設為 repo 根目錄
const ROOT = process.env.PHASE1_ROOT ? path.resolve(process.env.PHASE1_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRE_BUILD = process.argv.includes('--require-build');
const MARKETING = path.join(ROOT, 'apps', 'marketing');
const ADMIN = path.join(ROOT, 'apps', 'admin');

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

function newestMtime(dirs) {
  let newest = 0;
  for (const dir of dirs) for (const file of walk(dir)) newest = Math.max(newest, statSync(file).mtimeMs);
  return newest;
}

// ---------------------------------------------------------------------------
// 需求清單
// ---------------------------------------------------------------------------
const ASTRO_ROUTES = [
  ['Astro home page', '/'],
  ['Astro products index page', '/products'],
  ['Astro SEO website product page', '/products/seo-website'],
  ['Astro landing page product page', '/products/landing-page'],
  ['Astro landing page: group buy promo', '/products/landing-page/group-buy-promo'],
  ['Astro landing page: event registration', '/products/landing-page/event-registration'],
  ['Astro landing page: course enrollment', '/products/landing-page/course-enrollment'],
  ['Astro landing page: booking form', '/products/landing-page/booking-form'],
  ['Astro ecommerce product page', '/products/ecommerce-website'],
  ['Astro promo page design product page', '/products/promo-page-design'],
  ['Astro SEO article generator product page', '/products/seo-article-generator'],
  ['Astro solutions page', '/solutions'],
  ['Astro cases page', '/cases'],
  ['Astro blog page', '/blog'],
  ['Astro about page', '/about'],
  ['Astro contact page', '/contact'],
  ['Astro checkout page', '/checkout'],
  ['Astro terms page', '/legal/terms'],
  ['Astro privacy page', '/legal/privacy'],
];

const ADMIN_ROUTES = [
  ['Admin index route', '/admin'],
  ['Admin login route', '/admin/login'],
  ['Admin dashboard route', '/admin/dashboard'],
  ['Admin CMS route', '/admin/cms'],
  ['Admin CMS pages route', '/admin/cms/pages'],
  ['Admin CMS navigation route', '/admin/cms/navigation'],
  ['Admin CMS assets route', '/admin/cms/assets'],
  ['Admin CMS SEO route', '/admin/cms/seo'],
  ['Admin CMS site settings route', '/admin/cms/site-settings'],
  ['Admin commerce route', '/admin/commerce'],
  ['Admin commerce products route', '/admin/commerce/products'],
  ['Admin commerce prices route', '/admin/commerce/prices'],
  ['Admin commerce orders route', '/admin/commerce/orders'],
  ['Payment providers route', '/admin/commerce/payment-providers'],
  ['Admin commerce subscriptions route', '/admin/commerce/subscriptions'],
  ['Admin access codes route', '/admin/access-codes'],
  ['Admin access codes generated route', '/admin/access-codes/generated'],
  ['Admin access codes redeemed route', '/admin/access-codes/redeemed'],
  ['Admin templates route', '/admin/templates'],
  ['Admin templates list route', '/admin/templates/list'],
  ['Admin template licenses route', '/admin/templates/licenses'],
  ['Admin customer sites route', '/admin/customer-sites'],
  ['Admin customer site projects route', '/admin/customer-sites/projects'],
  ['Admin customer site domains route', '/admin/customer-sites/domains'],
  ['Admin customer site deployments route', '/admin/customer-sites/deployments'],
  ['Admin SEO generator route', '/admin/seo-generator'],
  ['Admin SEO generator projects route', '/admin/seo-generator/projects'],
  ['Admin SEO generator usage route', '/admin/seo-generator/usage'],
  ['Admin settings route', '/admin/settings'],
  ['Admin settings users route', '/admin/settings/users'],
  ['Admin settings roles route', '/admin/settings/roles'],
  ['Admin settings audit logs route', '/admin/settings/audit-logs'],
  ['Portal index route', '/portal'],
  ['Portal login route', '/portal/login'],
  ['Portal redeem code route', '/portal/redeem-code'],
  ['Portal dashboard route', '/portal/dashboard'],
  ['Portal sites route', '/portal/sites'],
  ['Portal new site route', '/portal/sites/new'],
  ['Portal site overview route', '/portal/sites/[siteId]'],
  ['Portal site content route', '/portal/sites/[siteId]/content'],
  ['Portal site appearance route', '/portal/sites/[siteId]/appearance'],
  ['Portal site SEO route', '/portal/sites/[siteId]/seo'],
  ['Portal site forms route', '/portal/sites/[siteId]/forms'],
  ['Portal site domain route', '/portal/sites/[siteId]/domain'],
  ['Portal site preview route', '/portal/sites/[siteId]/preview'],
  ['Portal site publish route', '/portal/sites/[siteId]/publish'],
  ['Portal billing route', '/portal/billing'],
  ['Portal templates route', '/portal/templates'],
  ['Portal support route', '/portal/support'],
];

const ASTRO_COMPONENTS = [
  'Header', 'Footer', 'Container', 'Section', 'SectionHeading', 'ButtonLink', 'ProductCard',
  'CaseCard', 'BlogCard', 'PricingCard', 'FAQList', 'CTASection', 'Breadcrumbs',
];

const ADMIN_COMPONENTS = [
  'AdminShell', 'PortalShell', 'Sidebar', 'Topbar', 'PageHeader', 'StatCard', 'DataTablePlaceholder', 'FormSection',
  'TextInput', 'TextArea', 'SelectField', 'ToggleField', 'EmptyState', 'LoadingState', 'ErrorState', 'CodeDisplay',
  'DNSInstructionCard', 'PaymentProviderCard', 'TemplateCard',
];

const ROOT_FILES = ['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'tsconfig.base.json', '.env.example', 'README.md', 'eslint.config.mjs'];
const WORKSPACE_DIRS = [
  'apps/marketing', 'apps/admin', 'packages/config', 'packages/database', 'packages/ui', 'packages/seo',
  'packages/auth', 'packages/shared', 'supabase/migrations', 'supabase/tests', 'docs',
];

const ENV_KEYS = [
  'PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_PUBLIC_URL', 'ADMIN_PUBLIC_URL',
  'PLATFORM_SUBDOMAIN_ROOT', 'EC_PAY_MERCHANT_ID', 'EC_PAY_HASH_KEY', 'EC_PAY_HASH_IV', 'LINE_PAY_CHANNEL_ID',
  'LINE_PAY_CHANNEL_SECRET', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN',
];

// ---------------------------------------------------------------------------
// Astro 路由解析
// ---------------------------------------------------------------------------
function parseSegment(segment) {
  const rest = segment.match(/^\[\.\.\.([^\]]+)\]$/);
  if (rest) return { type: 'rest', name: rest[1] };
  const dynamic = segment.match(/^\[([^\]]+)\]$/);
  if (dynamic) return { type: 'dynamic', name: dynamic[1] };
  return { type: 'static', value: segment };
}

function collectAstroRoutes() {
  const pagesDir = path.join(MARKETING, 'src', 'pages');
  return walk(pagesDir).flatMap((file) => {
    const ext = path.extname(file);
    if (!['.astro', '.md', '.mdx', '.html'].includes(ext)) return []; // 只比對頁面（endpoint 不算頁面）
    const relative = path.relative(pagesDir, file).split(path.sep).join('/');
    if (relative.split('/').some((segment) => segment.startsWith('_'))) return [];
    let segments = relative.slice(0, -ext.length).split('/');
    if (segments.at(-1) === 'index') segments = segments.slice(0, -1);
    return [{ file, segments: segments.map(parseSegment) }];
  });
}

function matchAstroRoute(route, pathSegments) {
  const params = {};
  for (let index = 0; index < route.segments.length; index += 1) {
    const segment = route.segments[index];
    if (segment.type === 'rest') {
      params[segment.name] = pathSegments.slice(index).join('/');
      return params;
    }
    const value = pathSegments[index];
    if (value === undefined) return null;
    if (segment.type === 'static' && segment.value !== value) return null;
    if (segment.type === 'dynamic') params[segment.name] = value;
  }
  return route.segments.length === pathSegments.length ? params : null;
}

function routeRank(route) {
  // Astro 優先序：靜態 > 動態 > rest
  const count = (type) => route.segments.filter((segment) => segment.type === type).length;
  return [count('static'), count('dynamic'), -count('rest')];
}

function relativeImports(file) {
  const source = readFileSync(file, 'utf8');
  const modules = [];
  for (const match of source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const base = path.resolve(path.dirname(file), match[1]);
    const candidates = [base, ...['.ts', '.js', '.mjs', '.json'].map((ext) => base + ext), path.join(base, 'index.ts'), path.join(base, 'index.js')];
    const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (found) modules.push(found);
  }
  return modules;
}

function verifyAstroSource(requiredPath) {
  const pathSegments = requiredPath.split('/').filter(Boolean);
  const matches = collectAstroRoutes()
    .map((route) => ({ route, params: matchAstroRoute(route, pathSegments) }))
    .filter((item) => item.params !== null)
    .sort((a, b) => {
      const ra = routeRank(a.route);
      const rb = routeRank(b.route);
      return rb[0] - ra[0] || rb[1] - ra[1] || rb[2] - ra[2];
    });
  if (matches.length === 0) return { ok: false, detail: 'no matching route file in apps/marketing/src/pages' };

  const { route, params } = matches[0];
  const values = Object.values(params);
  if (values.length === 0) return { ok: true, detail: rel(route.file) };

  const source = readFileSync(route.file, 'utf8');
  if (!/export\s+(async\s+)?function\s+getStaticPaths|export\s+const\s+getStaticPaths/.test(source)) {
    return { ok: false, detail: `${rel(route.file)} is dynamic but has no getStaticPaths` };
  }
  // 先找相對 import 的資料模組（getStaticPaths 資料來源），最後才看路由檔本身
  const definitionFiles = [...relativeImports(route.file), route.file];
  const missing = [];
  const declaredIn = new Set();
  for (const value of values) {
    const pattern = new RegExp(`['"\`]${escapeRegExp(value)}['"\`]`);
    const hit = definitionFiles.find((file) => pattern.test(readFileSync(file, 'utf8')));
    if (hit) declaredIn.add(rel(hit));
    else missing.push(value);
  }
  if (missing.length > 0) return { ok: false, detail: `${rel(route.file)} getStaticPaths value not declared: ${missing.join(', ')}` };
  return { ok: true, detail: `${rel(route.file)} (getStaticPaths ← ${[...declaredIn].join(', ')})` };
}

// ---------------------------------------------------------------------------
// Next.js App Router 路由解析
// ---------------------------------------------------------------------------
const normalizeNextRoute = (route) => route.replace(/\[\[?(\.\.\.)?[^\]]+\]\]?/g, (segment) => (segment.includes('...') ? '[...*]' : '[*]'));

function collectNextRoutes() {
  const appDirs = [path.join(ADMIN, 'src', 'app'), path.join(ADMIN, 'app')].filter(existsSync);
  return appDirs.flatMap((appDir) =>
    walk(appDir)
      .filter((file) => /^page\.(tsx|ts|jsx|js|mdx)$/.test(path.basename(file)))
      .flatMap((file) => {
        const dirSegments = path.relative(appDir, path.dirname(file)).split(path.sep).filter(Boolean);
        if (dirSegments.some((segment) => segment.startsWith('_'))) return [];
        const segments = dirSegments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')) && !segment.startsWith('@'));
        return [{ file, route: `/${segments.join('/')}` }];
      }),
  );
}

// ---------------------------------------------------------------------------
// Build output
// ---------------------------------------------------------------------------
function astroBuildState() {
  const dist = path.join(MARKETING, 'dist');
  const marker = path.join(dist, 'index.html');
  if (!existsSync(marker)) return { state: 'missing' };
  const sourceNewest = newestMtime([path.join(MARKETING, 'src'), ...['shared', 'seo', 'ui', 'database'].map((name) => path.join(ROOT, 'packages', name, 'src'))]);
  return { state: statSync(marker).mtimeMs + 1000 < sourceNewest ? 'stale' : 'ok', dist };
}

function astroBuildHas(dist, requiredPath) {
  const trimmed = requiredPath.replace(/^\/+|\/+$/g, '');
  const candidates = trimmed ? [path.join(dist, trimmed, 'index.html'), path.join(dist, `${trimmed}.html`)] : [path.join(dist, 'index.html')];
  return candidates.find((candidate) => existsSync(candidate));
}

function nextBuildState() {
  const manifest = path.join(ADMIN, '.next', 'app-path-routes-manifest.json');
  const buildId = path.join(ADMIN, '.next', 'BUILD_ID');
  if (!existsSync(manifest) || !existsSync(buildId)) return { state: 'missing' };
  const sourceNewest = newestMtime([path.join(ADMIN, 'src'), ...['shared', 'auth', 'ui', 'database'].map((name) => path.join(ROOT, 'packages', name, 'src'))]);
  const routes = new Set(Object.values(JSON.parse(readFileSync(manifest, 'utf8'))).map(normalizeNextRoute));
  return { state: statSync(buildId).mtimeMs + 1000 < sourceNewest ? 'stale' : 'ok', routes };
}

// ---------------------------------------------------------------------------
// 執行
// ---------------------------------------------------------------------------
const results = [];
const record = (group, ok, detail, build = '') => results.push({ group, ok, detail, build });

for (const file of ROOT_FILES) record(`Root file ${file}`, existsSync(path.join(ROOT, file)), file);
for (const dir of WORKSPACE_DIRS) {
  const full = path.join(ROOT, dir);
  record(`Workspace ${dir}`, existsSync(full) && statSync(full).isDirectory(), dir);
}

const astroBuild = astroBuildState();
for (const [group, requiredPath] of ASTRO_ROUTES) {
  const source = verifyAstroSource(requiredPath);
  let buildNote = `build: ${astroBuild.state}`;
  let ok = source.ok;
  if (astroBuild.state === 'ok') {
    const output = astroBuildHas(astroBuild.dist, requiredPath);
    buildNote = output ? `build: ${rel(output)}` : 'build: MISSING html';
    ok = ok && Boolean(output);
  } else if (REQUIRE_BUILD) {
    ok = false;
  }
  record(`${group} (${requiredPath})`, ok, source.detail, buildNote);
}

const nextRoutes = collectNextRoutes();
const nextBuild = nextBuildState();
for (const [group, requiredPath] of ADMIN_ROUTES) {
  const wanted = normalizeNextRoute(requiredPath);
  const sources = nextRoutes.filter((route) => normalizeNextRoute(route.route) === wanted);
  let ok = sources.length === 1;
  const detail = sources.length === 1 ? rel(sources[0].file) : sources.length === 0 ? 'no page file found in apps/admin/src/app' : `ambiguous: ${sources.map((s) => rel(s.file)).join(', ')}`;
  let buildNote = `build: ${nextBuild.state}`;
  if (nextBuild.state === 'ok') {
    const built = nextBuild.routes.has(wanted);
    buildNote = built ? 'build: in app-path-routes-manifest' : 'build: MISSING in manifest';
    ok = ok && built;
  } else if (REQUIRE_BUILD) {
    ok = false;
  }
  record(`${group} (${requiredPath})`, ok, detail, buildNote);
}

for (const name of ASTRO_COMPONENTS) {
  const file = path.join(MARKETING, 'src', 'components', `${name}.astro`);
  record(`Astro component ${name}`, existsSync(file), rel(file));
}

const adminComponentFiles = walk(path.join(ADMIN, 'src', 'components')).filter((file) => file.endsWith('.tsx'));
for (const name of ADMIN_COMPONENTS) {
  const pattern = new RegExp(`export\\s+(function|const)\\s+${name}\\b`);
  const hit = adminComponentFiles.find((file) => pattern.test(readFileSync(file, 'utf8')));
  record(`Admin component ${name}`, Boolean(hit), hit ? rel(hit) : 'export not found in apps/admin/src/components');
}

const boundaryFiles = [
  ['Supabase browser client placeholder', 'packages/database/src/client.ts'],
  ['Supabase server client placeholder', 'packages/database/src/server.ts'],
  ['Database types placeholder', 'packages/database/src/types/database.types.ts'],
  ['Repository interface', 'packages/database/src/repositories.ts'],
  ['Mock repository', 'packages/database/src/mock/repositories.ts'],
  ['Future generated types path', 'packages/database/src/generated'],
];
for (const [group, file] of boundaryFiles) record(group, existsSync(path.join(ROOT, file)), file);

const serverBoundary = path.join(ADMIN, 'src', 'lib', 'supabase', 'service-role.ts');
record('Service role client is server-only', existsSync(serverBoundary) && /import\s+['"]server-only['"]/.test(readFileSync(serverBoundary, 'utf8')), rel(serverBoundary));
const marketingSource = walk(path.join(MARKETING, 'src')).map((file) => readFileSync(file, 'utf8')).join('\n');
record('Astro never reads service role key', !/env\.SUPABASE_SERVICE_ROLE_KEY/.test(marketingSource), 'apps/marketing/src');

const envExample = existsSync(path.join(ROOT, '.env.example')) ? readFileSync(path.join(ROOT, '.env.example'), 'utf8') : '';
for (const key of ENV_KEYS) {
  const line = envExample.split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
  record(`.env.example ${key} present and empty`, line === `${key}=`, line ?? 'missing');
}

const contentChecks = [
  ['Redeem code page: input + format hint', 'apps/admin/src/components/portal/RedeemCodeForm.tsx', [/name="code"/, /ACCESS_CODE_EXAMPLE/]],
  ['Access code format example', 'packages/shared/src/access-code.ts', [/SYT-SEO-2026-A8K3Q9/]],
  ['Domain page: DNS instruction heading', 'apps/admin/src/components/domain/DNSInstructionCard.tsx', [/請到你的網域 DNS 後台新增以下紀錄/]],
  ['Domain page: apex domain notice', 'packages/shared/src/dns.ts', [/根網域設定會因 DNS 服務商不同而不同，建議先使用 www 開頭的網址。/]],
  ['Payment providers: 5 provider cards', 'packages/database/src/mock/data.ts', [/key: 'ecpay'/, /key: 'bank_transfer'/, /key: 'linepay'/, /key: 'subscription_monthly'/, /key: 'subscription_yearly'/]],
  ['Access codes admin: no manual code entry', 'apps/admin/src/components/access-codes/AccessCodesView.tsx', [/不提供人工輸入自訂代碼/]],
];
for (const [group, file, patterns] of contentChecks) {
  const full = path.join(ROOT, file);
  const source = existsSync(full) ? readFileSync(full, 'utf8') : '';
  record(group, patterns.every((pattern) => pattern.test(source)), file);
}

// ---------------------------------------------------------------------------
// 輸出
// ---------------------------------------------------------------------------
const failed = results.filter((item) => !item.ok);
for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.group}\n      ${item.detail}${item.build ? `  |  ${item.build}` : ''}`);
}
console.log('');
console.log(`Astro build output: ${astroBuild.state}  |  Next.js build output: ${nextBuild.state}${REQUIRE_BUILD ? '  (--require-build)' : ''}`);
if (!REQUIRE_BUILD && (astroBuild.state !== 'ok' || nextBuild.state !== 'ok')) {
  console.log('Note: build output 未建置或過期，本次只完成 source route definition 驗證；build 後請執行 --require-build。');
}
console.log(`Phase 1 structure: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log(`FAILED groups:\n- ${failed.map((item) => item.group).join('\n- ')}`);
  process.exit(1);
}
