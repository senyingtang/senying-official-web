// Phase 2.8 本機 Supabase 共用工具（只允許本專案的 local stack）
//
// - CLI：SUPABASE_CLI 環境變數，未設定時使用 `npx --no-install supabase`
// - 連線資訊一律從 `supabase status -o env` 即時讀取，只放在 process env / 記憶體，不寫入檔案
// - 安全檢查：API 必須是 127.0.0.1:54421、DB 必須是 54422（supabase/config.toml），否則拒絕執行（避免誤連正式或其他專案）
// - SQL 透過 `docker exec supabase_db_syt-official-website psql` 執行，不依賴本機 psql，也不會連到其他 Supabase stack
// - 報告只輸出遮罩後的 key
import { spawnSync } from 'node:child_process';
import { ROOT } from './servers.mjs';

export const PROJECT_ID = 'syt-official-website';
export const DB_CONTAINER = `supabase_db_${PROJECT_ID}`;
export const LOCAL_API_PORT = 54421;
export const LOCAL_DB_PORT = 54422;
export const LOCAL_STUDIO_PORT = 54423;

export function supabaseCli(args, { capture = true, input } = {}) {
  const cli = process.env.SUPABASE_CLI?.trim() || 'npx --no-install supabase';
  const quoted = args.map((arg) => (/^[\w./:=@-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`)).join(' ');
  return spawnSync(`${cli} ${quoted}`, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    input,
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** 遮罩 key：只保留前 6 碼與長度 */
export const maskSecret = (value) => (value ? `${String(value).slice(0, 6)}…(${String(value).length} chars)` : '(empty)');

function isLocalHost(hostname) {
  return /^(127\.0\.0\.1|localhost|\[::1\])$/i.test(hostname);
}

/**
 * 讀取本機 Supabase 連線資訊並檢查只能是本專案 local stack。
 * @returns {{ apiUrl: string, dbUrl: string, studioUrl: string, anonKey: string, serviceRoleKey: string }}
 */
export function getLocalSupabaseEnv() {
  const result = supabaseCli(['status', '-o', 'env']);
  if (result.status !== 0) {
    throw new Error(`本機 Supabase 未啟動或無法讀取狀態（請先執行 supabase start）：${(result.stderr || result.stdout || '').split('\n').find(Boolean) ?? ''}`);
  }
  const values = Object.fromEntries(
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
  const env = {
    apiUrl: values.API_URL ?? '',
    dbUrl: values.DB_URL ?? '',
    studioUrl: values.STUDIO_URL ?? '',
    anonKey: values.ANON_KEY ?? values.PUBLISHABLE_KEY ?? '',
    serviceRoleKey: values.SERVICE_ROLE_KEY ?? values.SECRET_KEY ?? '',
  };
  assertLocalEnv(env);
  return env;
}

export function assertLocalEnv(env) {
  const api = new URL(env.apiUrl);
  const db = new URL(env.dbUrl.replace(/^postgres(ql)?:/, 'http:'));
  if (!isLocalHost(api.hostname) || Number(api.port) !== LOCAL_API_PORT) throw new Error(`拒絕執行：API URL 不是本專案本機 Supabase（${api.host}）`);
  if (!isLocalHost(db.hostname) || Number(db.port) !== LOCAL_DB_PORT) throw new Error(`拒絕執行：DB URL 不是本專案本機 Supabase（${db.host}）`);
  if (!env.anonKey || !env.serviceRoleKey) throw new Error('本機 Supabase status 缺少 anon / service role key');
}

/** 本機 Supabase 對應的應用程式 env（只傳給子程序，不寫檔） */
export function appEnv(env, { withServiceRole = false } = {}) {
  return {
    DATA_SOURCE: 'supabase',
    PUBLIC_SUPABASE_URL: env.apiUrl,
    PUBLIC_SUPABASE_ANON_KEY: env.anonKey,
    ...(withServiceRole ? { SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey } : {}),
  };
}

export function dbContainerRunning() {
  const result = spawnSync('docker', ['ps', '--filter', `name=^${DB_CONTAINER}$`, '--format', '{{.Names}}'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === DB_CONTAINER;
}

/** 在本專案 DB container 內以 postgres 執行 SQL（ON_ERROR_STOP） */
export function psql(sql, { tuplesOnly = false } = {}) {
  if (!dbContainerRunning()) throw new Error(`找不到 ${DB_CONTAINER}（請先 supabase start）`);
  const args = ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1'];
  if (tuplesOnly) args.push('-A', '-t', '-q');
  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** 執行單一查詢並解析 JSON（查詢需回傳一個 json 值） */
export function psqlJson(query) {
  const result = psql(`select coalesce((${query})::text, 'null');`, { tuplesOnly: true });
  if (!result.ok) throw new Error(`SQL 失敗：${result.stderr.split('\n').find(Boolean) ?? ''}`);
  return JSON.parse(result.stdout.trim() || 'null');
}

/** SQL 字串常值跳脫 */
export const sqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;
