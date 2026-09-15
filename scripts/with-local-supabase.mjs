// 以本機 Supabase 連線資訊執行指令（Phase 2.8）
//
// - 連線資訊即時從 `supabase status -o env` 讀取，只注入子程序 env，不寫入 .env.local 或任何檔案
// - 只接受本專案 local stack（127.0.0.1:54421 / 54422），不會連正式專案
// - 注入 DATA_SOURCE=supabase、PUBLIC_SUPABASE_URL、PUBLIC_SUPABASE_ANON_KEY；不注入 service role（admin 與 Astro 都不需要）
//
// 用法：
//   pnpm supabase:status              顯示本機 URL / port（key 遮罩）
//   pnpm db:types                     supabase gen types typescript --local → packages/database/src/generated/supabase.ts
//   pnpm dev:admin:supabase           後台 dev server（DATA_SOURCE=supabase）
//   pnpm build:marketing:supabase     官網 build 讀取本機 site settings（會輸出到 apps/marketing/dist，驗收前請重新 pnpm build）
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { appEnv, getLocalSupabaseEnv, maskSecret, supabaseCli } from './lib/local-supabase.mjs';
import { ROOT } from './lib/servers.mjs';

const args = process.argv.slice(2);
const env = getLocalSupabaseEnv();

if (args[0] === '--status') {
  console.log(`API URL     ${env.apiUrl}`);
  console.log(`DB URL      ${env.dbUrl.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Studio URL  ${env.studioUrl}`);
  console.log(`anon key    ${maskSecret(env.anonKey)}`);
  console.log(`service key ${maskSecret(env.serviceRoleKey)}（只用於本機伺服器端測試）`);
  process.exit(0);
}

if (args[0] === '--gen-types') {
  const result = supabaseCli(['gen', 'types', 'typescript', '--local']);
  if (result.status !== 0 || !result.stdout.includes('export type Database')) {
    console.error('supabase gen types 失敗');
    process.exit(1);
  }
  const target = path.join(ROOT, 'packages', 'database', 'src', 'generated', 'supabase.ts');
  writeFileSync(target, result.stdout);
  console.log(`generated ${path.relative(ROOT, target)}`);
  process.exit(0);
}

if (args.length === 0) {
  console.error('usage: node scripts/with-local-supabase.mjs <command...>');
  process.exit(1);
}
console.log(`[local-supabase] DATA_SOURCE=supabase PUBLIC_SUPABASE_URL=${env.apiUrl} anon=${maskSecret(env.anonKey)}`);
const childEnv = { ...process.env, ...appEnv(env) };
delete childEnv.SUPABASE_SERVICE_ROLE_KEY;
const result = spawnSync(args.join(' '), { cwd: ROOT, shell: true, stdio: 'inherit', env: childEnv });
process.exit(result.status ?? 1);
