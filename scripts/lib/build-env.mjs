// 驗收 build 的 env 與 outDir（Phase 3.1.1）
//
// - PUBLIC_* 會在 build 時內嵌到 client bundle；turbo 的 env hash 只看 process env，看不到 .env* 檔案內容。
//   因此 mock build 一律「顯式清掉」PUBLIC_SUPABASE_*，supabase build 一律「顯式注入」，不依賴 shell 殘留或 .env 檔。
// - 每次 build 前清掉對應 outDir，避免 turbo cache 還原或上一輪的 hashed assets 與新 build 共存。
// - service role 永遠不進 build env。
import { rmSync } from 'node:fs';
import path from 'node:path';
import { MARKETING_DIR, ROOT } from './servers.mjs';

const PUBLIC_SUPABASE_KEYS = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY'];

/** DATA_SOURCE=mock 的 build env：PUBLIC_SUPABASE_* 與 service role 一律移除 */
export function mockBuildEnv(extra = {}) {
  const env = { ...process.env, ...extra, DATA_SOURCE: 'mock' };
  for (const key of [...PUBLIC_SUPABASE_KEYS, 'SUPABASE_SERVICE_ROLE_KEY']) delete env[key];
  return env;
}

/** DATA_SOURCE=supabase 的 build env：PUBLIC_* 由呼叫端（appEnv）顯式注入，缺少就不 build */
export function supabaseBuildEnv(publicEnv, extra = {}) {
  const missing = PUBLIC_SUPABASE_KEYS.filter((key) => !String(publicEnv?.[key] ?? '').trim());
  if (missing.length > 0) throw new Error(`DATA_SOURCE=supabase build 缺少 ${missing.join(' / ')}，拒絕改用 mock`);
  const env = { ...process.env, ...extra, ...publicEnv, DATA_SOURCE: 'supabase' };
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return env;
}

/** 依 DATA_SOURCE 選擇 build env（未設定視為 mock） */
export function buildEnvFor(extra = {}) {
  const dataSource = (extra.DATA_SOURCE ?? process.env.DATA_SOURCE ?? 'mock').trim() || 'mock';
  if (dataSource === 'mock') return mockBuildEnv(extra);
  const source = { ...process.env, ...extra };
  return supabaseBuildEnv(Object.fromEntries(PUBLIC_SUPABASE_KEYS.map((key) => [key, source[key]])), extra);
}

/** build 前清掉 Astro outDir（只允許 repo 內的路徑；outDir 相對於 apps/marketing，與 ASTRO_OUT_DIR 相同） */
export function cleanMarketingOutDir(outDir = 'dist') {
  const target = path.resolve(MARKETING_DIR, outDir);
  if (!target.startsWith(ROOT + path.sep) || target === MARKETING_DIR) throw new Error(`refusing to clean ${target}`);
  rmSync(target, { recursive: true, force: true });
}

/** 指令是否會 build 官網（pnpm build / pnpm --filter @syt/marketing build） */
export const buildsMarketing = (command) => /^pnpm (build|--filter @syt\/marketing build)\b/.test(command.trim());
