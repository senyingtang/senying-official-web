// Phase 2.8 本機 env / key 安全驗收
//
//   1. .gitignore 涵蓋 .env.local、apps/admin/.env.local、apps/marketing/.env.local、supabase/.temp、驗收報告資料夾
//   2. 沒有 supabase link 正式專案（無 project-ref、package.json 沒有 db push / link）
//   3. 本機 service role key 不在 build output（marketing dist、supabase-dist、admin .next/static）
//   4. 本機 anon key 可以存在 browser（Astro static 預設不需要；只列出狀態）
//   5. repo 沒有正式 Supabase 網址 / sb_secret / 任何 JWT 形式的 key
//   6. 報告 / 文件 / log 不含完整 key（anon 與 service role）
//   7. .env.example 保持空白值；腳本輸出 key 時一律遮罩
//   8. 已追蹤檔案不含 sb_secret_ / service role（Phase 3.1.1）
//   9. mock build（apps/marketing/dist）publishable / anon key 出現次數為 0，且全部頁面 data-commerce-backend="mock"（Phase 3.1.1）
//
// 用法：pnpm local-env:verify（需要本機 Supabase 已啟動以取得要比對的本機 key）
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { getLocalSupabaseEnv, maskSecret } from './lib/local-supabase.mjs';
import { ADMIN_DIR, MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { createReport, read, rel, walk } from './lib/static-site.mjs';

const report = createReport('Phase 2.8 local env security');
const { record } = report;
const TEXT = /\.(ts|tsx|mts|mjs|js|cjs|astro|json|md|mdx|sql|toml|yaml|yml|txt|html|css|xml|env|example|csv)$/i;
const SKIP = new Set(['node_modules', '.git', '.turbo', 'cache', '.astro']);

// ---------------------------------------------------------------------------
// 1. .gitignore
// ---------------------------------------------------------------------------
{
  const patterns = read(path.join(ROOT, '.gitignore'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const toRegex = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
  /** 簡化版 gitignore 判斷：無斜線的 pattern 比對任一層名稱；結尾斜線代表資料夾；支援 ! 反向 */
  const ignored = (target) => {
    const segments = target.split('/');
    let result = false;
    for (const raw of patterns) {
      const negate = raw.startsWith('!');
      const pattern = negate ? raw.slice(1) : raw;
      const dirOnly = pattern.endsWith('/');
      const body = pattern.replace(/\/$/, '').replace(/^\//, '');
      let match;
      if (body.includes('/')) match = toRegex(body).test(target) || (dirOnly && target.startsWith(`${body}/`));
      else match = segments.some((segment, index) => toRegex(body).test(segment) && (!dirOnly || index < segments.length - 1));
      if (match) result = !negate;
    }
    return result;
  };
  const targets = ['.env.local', 'apps/admin/.env.local', 'apps/marketing/.env.local', '.env.supabase.local', 'apps/marketing/.env.supabase.local', 'supabase/.temp/project-ref', 'supabase/.branches/_current_branch', '.phase28-report/database-bundle.mjs', '.phase27-report/x'];
  const notIgnored = targets.filter((target) => !ignored(target));
  const exampleTracked = !ignored('.env.example') && !ignored('apps/marketing/.env.example');
  // 簡化判斷之外再以 git 本身確認（Phase 3.1.1：正式憑證放在 apps/marketing/.env.supabase.local，Vite 不會自動載入）
  const gitIgnored = (target) => spawnSync(`git check-ignore -q --no-index "${target}"`, { cwd: ROOT, shell: true }).status === 0;
  const gitProblems = [
    !gitIgnored('apps/marketing/.env.supabase.local') && 'git 未忽略 apps/marketing/.env.supabase.local',
    gitIgnored('.env.example') && 'git 忽略了 .env.example',
    gitIgnored('apps/marketing/.env.example') && 'git 忽略了 apps/marketing/.env.example',
  ].filter(Boolean);
  record(
    1,
    '.gitignore 涵蓋 .env.local（根目錄 / apps/admin / apps/marketing）、apps/marketing/.env.supabase.local、supabase/.temp、驗收報告，且 .env.example 仍會提交',
    notIgnored.length === 0 && exampleTracked && gitProblems.length === 0,
    [...notIgnored, ...gitProblems].join(', ') || `${targets.length} paths ignored`,
  );
}

// ---------------------------------------------------------------------------
// 2. 沒有 link 正式專案
// ---------------------------------------------------------------------------
{
  const packageJson = JSON.parse(read(path.join(ROOT, 'package.json')));
  const dangerousScripts = Object.entries(packageJson.scripts ?? {}).filter(([, command]) => /supabase\s+(link|db\s+push)|--linked|db\s+push/.test(command));
  const config = read(path.join(ROOT, 'supabase', 'config.toml'));
  const problems = [
    existsSync(path.join(ROOT, 'supabase', '.temp', 'project-ref')) && 'supabase/.temp/project-ref 存在（曾 link 遠端專案）',
    dangerousScripts.length > 0 && `package.json 含 ${dangerousScripts.map(([name]) => name).join(', ')}`,
    !/^project_id = "syt-official-website"$/m.test(config) && 'config.toml project_id 不是本專案',
    !/^port = 54421$/m.test(config) && 'config.toml API port 不是 54421',
  ].filter(Boolean);
  record(2, '沒有 supabase link / db push；config.toml 為本機專案（syt-official-website、544xx）', problems.length === 0, problems.join('; ') || 'local only');
}

let env = null;
try {
  env = getLocalSupabaseEnv();
} catch (error) {
  record(3, '取得本機 Supabase key（比對用）', false, error.message);
  report.finish('local-env:verify');
}

// ---------------------------------------------------------------------------
// 3–4. build output
// ---------------------------------------------------------------------------
{
  const SERVABLE = /\.(html|js|css|json|txt|xml|map)$/;
  // 瀏覽器看得到的輸出：連「SUPABASE_SERVICE_ROLE_KEY」這個字都不該出現
  const browserFiles = [
    ...walk(path.join(MARKETING_DIR, 'dist')),
    ...walk(path.join(ROOT, '.phase28-report', 'supabase-dist')),
    ...walk(path.join(ADMIN_DIR, '.next', 'static')),
    ...walk(path.join(ADMIN_DIR, '.next-supabase', 'static')),
  ].filter((file) => SERVABLE.test(file));
  // 後台 server bundle：process.env.SUPABASE_SERVICE_ROLE_KEY 是正常的（runtime 才讀），
  // 但 key 的「值」不可以被內嵌進 build output
  const serverFiles = [...walk(path.join(ADMIN_DIR, '.next-supabase'))]
    .filter((file) => SERVABLE.test(file) && !file.includes(`${path.sep}static${path.sep}`));
  const buildFiles = [...browserFiles, ...serverFiles];
  const leaks = [
    ...browserFiles.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return text.includes(env.serviceRoleKey) || /SUPABASE_SERVICE_ROLE_KEY/.test(text);
    }),
    ...serverFiles.filter((file) => readFileSync(file, 'utf8').includes(env.serviceRoleKey)),
  ];
  record(
    3,
    `本機 service role key 不在 build output（瀏覽器輸出連變數名都沒有；後台 server bundle 只允許 process.env 讀取；${buildFiles.length} files）`,
    browserFiles.length > 0 && leaks.length === 0,
    leaks.map(rel).slice(0, 3).join(', ') || `service role ${maskSecret(env.serviceRoleKey)} not found`,
  );

  const anonFiles = buildFiles.filter((file) => readFileSync(file, 'utf8').includes(env.anonKey)).map(rel);
  record(4, '本機 anon key 可存在 browser（公開 key）；Astro static 讀取設定只在 build 時使用', true, anonFiles.length ? `出現在 ${anonFiles.slice(0, 3).join(', ')}` : 'build output 未包含 anon key（build 時讀取，不送到瀏覽器）');
}

// ---------------------------------------------------------------------------
// 5–7. repo / 報告
// ---------------------------------------------------------------------------
{
  // 「repo 不含正式憑證」= git 真的會帶走的檔案不含：已追蹤的檔案 + 未被 ignore 的未追蹤檔案。
  // 被 .gitignore 忽略的本機檔案（例如 Phase 3.1 的 apps/marketing/.env.local）本來就不會進 repo，
  // 掃描它們只會把「本機設定」誤報成「repo 外洩」。改以 git 的視角取檔案清單，
  // 並額外加一條更嚴格的規則：任何含正式憑證的 .env* 檔一定要被 ignore，否則直接 FAIL。
  const gitList = (args) => {
    const result = spawnSync(`git ${args}`, { cwd: ROOT, shell: true, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
  };
  const gitVisible = [...new Set([...gitList('ls-files'), ...gitList('ls-files --others --exclude-standard')])]
    .map((relative) => path.join(ROOT, relative))
    .filter((file) => existsSync(file) && (TEXT.test(file) || path.basename(file).startsWith('.env')));
  const PRODUCTION_PATTERNS = [
    ['正式 Supabase 專案網址', /https?:\/\/[a-z0-9]{20}\.supabase\.(co|in)\b/i],
    ['sb_secret key', /\bsb_secret_[A-Za-z0-9_-]{16,}/],
    ['sb_publishable key', /\bsb_publishable_[A-Za-z0-9_-]{16,}/],
    ['JWT key', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ];
  const scan = (files) =>
    files.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return PRODUCTION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => `${label}: ${rel(file)}`);
    });
  const hits = scan(gitVisible);

  // 本機 .env* 可以放正式憑證，但必須確實被 ignore
  const localEnvFiles = walk(ROOT, new Set([...SKIP, 'dist', '.next', '.next-supabase', 'supabase-dist']))
    .filter((file) => path.basename(file).startsWith('.env') && path.basename(file) !== '.env.example');
  const unignoredEnv = localEnvFiles.filter((file) => {
    const check = spawnSync(`git check-ignore -q "${rel(file)}"`, { cwd: ROOT, shell: true });
    return check.status !== 0;
  });
  const leakyUnignored = scan(unignoredEnv).map((hit) => `未被 ignore 的 env：${hit}`);
  const withCredentials = localEnvFiles.filter((file) => PRODUCTION_PATTERNS.some(([, pattern]) => pattern.test(readFileSync(file, 'utf8'))));
  const problems = [...hits, ...leakyUnignored];
  record(
    5,
    `git 會帶走的檔案沒有正式 Supabase 網址、sb_secret / publishable、JWT key（${gitVisible.length} files）；本機 .env* 若含正式憑證必須被 ignore`,
    problems.length === 0,
    problems.slice(0, 4).join(' | ') ||
      `clean（本機 env 檔 ${localEnvFiles.length} 個，其中 ${withCredentials.length} 個含正式憑證且皆已被 .gitignore 忽略）`,
  );

  const reportFiles = [
    ...walk(path.join(ROOT, 'docs')),
    ...walk(path.join(ROOT, '.rwd-report')),
    ...walk(path.join(ROOT, '.global-ui-report')).filter((file) => !file.includes(`${path.sep}verification-dist${path.sep}`)),
    ...walk(path.join(ROOT, '.phase27-report')),
    ...walk(path.join(ROOT, '.phase28-report')).filter((file) => !file.includes(`${path.sep}supabase-dist${path.sep}`)),
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'supabase', 'README.md'),
  ].filter((file) => existsSync(file) && TEXT.test(file));
  const keyHits = reportFiles.filter((file) => {
    const text = readFileSync(file, 'utf8');
    return text.includes(env.serviceRoleKey) || text.includes(env.anonKey);
  });
  record(6, `報告 / 文件不含完整 key（${reportFiles.length} files）`, keyHits.length === 0, keyHits.map(rel).join(', ') || 'clean');

  const envExample = read(path.join(ROOT, '.env.example'));
  const exampleOk = ['PUBLIC_SUPABASE_URL=', 'PUBLIC_SUPABASE_ANON_KEY=', 'SUPABASE_SERVICE_ROLE_KEY='].every((line) => envExample.split(/\r?\n/).includes(line));
  const scriptFiles = walk(path.join(ROOT, 'scripts')).filter((file) => file.endsWith('.mjs'));
  const unmasked = scriptFiles.filter((file) =>
    read(file)
      .split('\n')
      .some((line) => /console\.(log|info|warn|error)\(/.test(line) && /\b(serviceRoleKey|anonKey)\b/.test(line) && !/maskSecret\(/.test(line)),
  );
  record(7, '.env.example 保持空白值；腳本輸出 key 一律 maskSecret', exampleOk && unmasked.length === 0, unmasked.map(rel).join(', ') || 'ok');

  // 8. 已追蹤檔案：sb_secret_ / service role（JWT role=service_role、env 檔形式的 SUPABASE_SERVICE_ROLE_KEY=<值>、本機 service role 值）
  const tracked = gitList('ls-files')
    .map((relative) => path.join(ROOT, relative))
    .filter((file) => existsSync(file) && (TEXT.test(file) || path.basename(file).startsWith('.env')));
  const jwtRole = (token) => {
    try {
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).role ?? null;
    } catch {
      return null;
    }
  };
  const secretHits = tracked.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    const found = [];
    if (/\bsb_secret_[A-Za-z0-9_-]{8,}/.test(text)) found.push('sb_secret_');
    if ((text.match(/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []).some((token) => jwtRole(token) === 'service_role')) found.push('service_role JWT');
    if (/^[ \t]*SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*\S+/m.test(text)) found.push('SUPABASE_SERVICE_ROLE_KEY=<值>');
    if (text.includes(env.serviceRoleKey)) found.push('本機 service role 值');
    return found.map((label) => `${label}: ${rel(file)}`);
  });
  record(8, `已追蹤檔案不含 sb_secret_ / service role key（${tracked.length} tracked files）`, secretHits.length === 0, secretHits.slice(0, 4).join(' | ') || 'clean');
}

// ---------------------------------------------------------------------------
// 9. mock build 不含 publishable / anon key（Phase 3.1.1）
// ---------------------------------------------------------------------------
{
  const dist = path.join(MARKETING_DIR, 'dist');
  const files = walk(dist).filter((file) => /\.(html|js|css|json|txt|xml|map)$/.test(file));
  const pages = files.filter((file) => file.endsWith('.html'));
  // 比對值：本機 anon key、apps/marketing/.env.supabase.local 內的 key（只在記憶體比對，不輸出）、任何 sb_publishable_ / JWT 形式
  const credentialFile = read(path.join(MARKETING_DIR, '.env.supabase.local'));
  const localValues = [env.anonKey, credentialFile.match(/^[ \t]*PUBLIC_SUPABASE_ANON_KEY[ \t]*=[ \t]*["']?([^"'\s]+)/m)?.[1]].filter((value) => value && value.length >= 16);
  let occurrences = 0;
  const hitFiles = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const count =
      localValues.reduce((sum, value) => sum + text.split(value).length - 1, 0) +
      (text.match(/\bsb_publishable_[A-Za-z0-9_-]{16,}/g) ?? []).length +
      (text.match(/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []).length;
    if (count > 0) hitFiles.push(rel(file));
    occurrences += count;
  }
  const notMock = pages.filter((file) => !/<html\b[^>]*\sdata-commerce-backend="mock"/.test(readFileSync(file, 'utf8'))).map(rel);
  record(
    9,
    `mock build（apps/marketing/dist）publishable / anon key 出現 0 次，且每頁 data-commerce-backend="mock"（${pages.length} pages / ${files.length} files）`,
    pages.length > 0 && occurrences === 0 && notMock.length === 0,
    pages.length === 0
      ? 'apps/marketing/dist 不存在，請先執行 mock build'
      : [occurrences && `key occurrences ${occurrences}：${hitFiles.slice(0, 3).join(', ')}`, notMock.length && `非 mock 頁面：${notMock.slice(0, 3).join(', ')}`].filter(Boolean).join(' | ') || 'key occurrences 0',
  );
}

report.finish('local-env:verify');
