// Phase 2.8.1 Git baseline 驗收
//
//   1. .git 存在                2. branch = main            3. remote origin = 官方 repo
//   4. working tree clean       5. .env.local 被 ignore（根目錄 / apps/admin / apps/marketing）
//   6. .next 被 ignore          7. dist 被 ignore            8. supabase/.temp 被 ignore
//   9. tracked 檔案不含禁止路徑與 secret pattern（含本機 Supabase service role，若本機 Supabase 有啟動）
//  10. HEAD 有 commit          11. origin/main 可解析（本機 ref + GitHub ls-remote）
//  12. HEAD == origin/main（本機與 GitHub 一致）
//
// 用法：pnpm git:verify
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/servers.mjs';
import { createReport } from './lib/static-site.mjs';

const EXPECTED_REMOTE = 'https://github.com/senyingtang/senying-official-web.git';
const report = createReport('Phase 2.8.1 Git baseline');
const { record } = report;

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
};

const gitDir = git('rev-parse', '--git-dir');
record(1, '.git 存在', gitDir.ok && gitDir.out === '.git', gitDir.out || gitDir.err);
if (!gitDir.ok) report.finish('git:verify');

const branch = git('branch', '--show-current').out;
record(2, 'branch = main', branch === 'main', branch);

const remote = git('remote', 'get-url', 'origin');
record(3, `remote origin = ${EXPECTED_REMOTE}`, remote.ok && remote.out === EXPECTED_REMOTE, remote.out || remote.err);

const status = git('status', '--porcelain');
record(4, 'working tree clean', status.ok && status.out === '', status.out.split('\n').slice(0, 5).join(' | ') || 'clean');

const ignored = (target) => spawnSync('git', ['check-ignore', '-q', target], { cwd: ROOT }).status === 0;
const envTargets = ['.env.local', 'apps/admin/.env.local', 'apps/marketing/.env.local', '.env'];
record(5, '.env / .env.local 被 ignore（根目錄 / apps/admin / apps/marketing）', envTargets.every(ignored) && !ignored('.env.example'), envTargets.map((target) => `${target}:${ignored(target)}`).join(' '));
record(6, '.next 被 ignore', ignored('apps/admin/.next') && ignored('apps/admin/.next/BUILD_ID'), 'apps/admin/.next');
record(7, 'dist 被 ignore', ignored('apps/marketing/dist') && ignored('apps/marketing/dist/index.html'), 'apps/marketing/dist');
record(8, 'supabase/.temp 被 ignore', ignored('supabase/.temp') && ignored('supabase/.temp/cli-latest'), 'supabase/.temp');

// 9. tracked files
{
  const tracked = git('ls-files', '-z').out.split('\0').filter(Boolean);
  const FORBIDDEN = /(^|\/)(\.env($|\.)|node_modules\/|\.next\/|dist\/|\.turbo\/|\.astro\/|\.rwd-report\/|\.global-ui-report\/|\.phase2[78]-report\/|supabase\/\.temp\/|supabase\/\.branches\/|coverage\/|playwright-report\/|test-results\/)|\.tsbuildinfo$|(^|\/)desktop\.ini$/;
  const forbidden = tracked.filter((file) => file !== '.env.example' && FORBIDDEN.test(file));
  // 同一行的「變數 = 值」才算（空白值、下一行內容不算）
  const PATTERNS = [
    ['env secret 值', /^[ \t]*(SUPABASE_SERVICE_ROLE_KEY|EC_PAY_HASH_KEY|EC_PAY_HASH_IV|LINE_PAY_CHANNEL_SECRET|CLOUDFLARE_API_TOKEN|AUTH_COOKIE_SECRET|SUPABASE_JWT_SECRET)[ \t]*=[ \t]*[^\s#]+/m],
    ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
    ['sb_secret / sb_publishable', /\bsb_(secret|publishable)_[A-Za-z0-9_-]{16,}/],
    ['正式 Supabase 網址', /https?:\/\/[a-z0-9]{20}\.supabase\.(co|in)\b/i],
    ['私鑰', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ];
  let localServiceRole = null;
  try {
    const { getLocalSupabaseEnv } = await import('./lib/local-supabase.mjs');
    localServiceRole = getLocalSupabaseEnv().serviceRoleKey;
  } catch {
    localServiceRole = null;
  }
  const TEXT = /\.(ts|tsx|mts|mjs|js|cjs|json|md|mdx|sql|toml|ya?ml|txt|astro|css|html|csv|svg|example)$|(^|\/)\.[a-z]+$/i;
  const hits = [];
  for (const file of tracked) {
    if (!TEXT.test(file)) continue;
    let text;
    try {
      text = readFileSync(path.join(ROOT, file), 'utf8');
    } catch {
      continue;
    }
    for (const [label, pattern] of PATTERNS) if (pattern.test(text)) hits.push(`${label}: ${file}`);
    if (localServiceRole && text.includes(localServiceRole)) hits.push(`本機 service role key: ${file}`);
  }
  record(
    9,
    `tracked 檔案（${tracked.length}）不含禁止路徑與 secret pattern${localServiceRole ? '（含本機 Supabase service role 比對）' : '（本機 Supabase 未啟動，略過 service role 實值比對）'}`,
    tracked.length > 0 && forbidden.length === 0 && hits.length === 0,
    [...forbidden.map((file) => `禁止路徑: ${file}`), ...hits].slice(0, 5).join(' | ') || 'clean',
  );
}

const head = git('rev-parse', 'HEAD');
record(10, 'HEAD 有 commit', head.ok && /^[0-9a-f]{40}$/.test(head.out), head.ok ? `${head.out.slice(0, 7)} ${git('log', '-1', '--format=%s').out}` : head.err);

const localOrigin = git('rev-parse', 'refs/remotes/origin/main');
const lsRemote = spawnSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, timeout: 60000 });
const remoteHash = (lsRemote.stdout ?? '').trim().split(/\s+/)[0] ?? '';
record(11, 'origin/main 可解析（本機 tracking ref + GitHub ls-remote）', localOrigin.ok && /^[0-9a-f]{40}$/.test(remoteHash), `local ${localOrigin.out.slice(0, 7) || localOrigin.err} · GitHub ${remoteHash.slice(0, 7) || 'unreachable'}`);
record(12, 'HEAD == origin/main（本機與 GitHub 一致）', head.ok && head.out === localOrigin.out && head.out === remoteHash, `HEAD ${head.out.slice(0, 7)} · origin/main ${localOrigin.out.slice(0, 7)} · GitHub ${remoteHash.slice(0, 7)}`);

report.finish('git:verify');
