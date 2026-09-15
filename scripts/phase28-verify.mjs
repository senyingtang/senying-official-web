// Phase 2.8 一鍵驗收（本機 Supabase + 既有全部驗收）
//
// 順序：
//   1. db:verify-sync        supabase/ 與 DB SQL v2.0 規格包一致
//   2. db:smoke              本機 DB：migrations、seed、SQL tests、PostgREST / GoTrue RLS
//   3. site-settings:verify  Admin（DATA_SOURCE=supabase）真實寫入 → DB → Marketing build → dist → rollback
//   4. local-env:verify      .gitignore、service role 不進 build、無正式 key、報告不含完整 key
//   5. phase27:verify        asset / seo / perf / global-ui / mockup / ui（--skip-rwd）→ phase2:verify
//
// phase2:verify 已包含在 phase27:verify 的最後一步，完整 RWD（528 checks）整輪只跑一次，不另外再跑 phase2:verify。
// site-settings:verify 的 Supabase build 輸出到 .phase28-report/supabase-dist，不影響 phase27 使用的預設 mock build。
//
// 前置：本機 Supabase 已啟動（pnpm supabase:start）。本腳本不會 link / push 任何遠端專案。
// 用法：pnpm phase28:verify [--from <step>]
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './lib/servers.mjs';

const steps = [
  { label: 'db:verify-sync', command: 'pnpm db:verify-sync' },
  { label: 'db:smoke', command: 'pnpm db:smoke' },
  { label: 'site-settings:verify', command: 'pnpm site-settings:verify' },
  { label: 'local-env:verify', command: 'pnpm local-env:verify' },
  { label: 'phase27:verify', command: 'pnpm phase27:verify', includes: 'phase2:verify（完整 RWD 一次）' },
];

const fromIndex = process.argv.indexOf('--from');
const from = fromIndex > -1 ? process.argv[fromIndex + 1] : undefined;
const startAt = from ? steps.findIndex((step) => step.label === from) : 0;
if (startAt < 0) {
  console.error(`[phase28] unknown step "${from}". Steps: ${steps.map((step) => step.label).join(', ')}`);
  process.exit(1);
}

function runStep(step) {
  return new Promise((resolve) => {
    // DATA_SOURCE 不在這裡強制：各子驗收自行決定（db / site-settings 使用本機 Supabase，phase27 內部固定 mock）
    const env = { ...process.env };
    delete env.DATA_SOURCE;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    const child = spawn(step.command, { cwd: ROOT, shell: true, env, stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const dockerOk = spawnSync('docker', ['ps', '--filter', 'name=^supabase_db_syt-official-website$', '--format', '{{.Names}}'], { encoding: 'utf8' }).stdout.trim() === 'supabase_db_syt-official-website';
if (!dockerOk && startAt < 3) {
  console.error('[phase28] 本機 Supabase（supabase_db_syt-official-website）未啟動，請先執行 pnpm supabase:start');
  process.exit(1);
}

const summary = [];
for (const step of steps.slice(startAt)) {
  console.log(`\n━━━━ ${step.label} (${step.command}) ━━━━`);
  const started = Date.now();
  const code = await runStep(step);
  summary.push({ step: step.label, ok: code === 0, seconds: ((Date.now() - started) / 1000).toFixed(1), code });
  if (code !== 0) break;
}

console.log('\n━━━━ Phase 2.8 verify summary ━━━━');
for (const step of steps) {
  const item = summary.find((entry) => entry.step === step.label);
  const skipped = steps.indexOf(step) < startAt;
  const label = item ? (item.ok ? 'PASS' : `FAIL (exit ${item.code})`) : skipped ? 'SKIPPED (--from)' : 'NOT RUN';
  console.log(`${label.padEnd(18)} ${item ? `${item.seconds.padStart(7)}s` : ''.padStart(8)}  ${step.label}${step.includes ? `（含 ${step.includes}）` : ''}`);
}
const allPassed = summary.length === steps.length - startAt && summary.every((item) => item.ok);
console.log(allPassed ? 'Phase 2.8 verify: ALL PASSED' : 'Phase 2.8 verify: FAILED');
process.exit(allPassed ? 0 : 1);
