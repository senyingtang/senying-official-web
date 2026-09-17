// Phase 3.0 一鍵驗收（Commerce / 購物車 / 結帳 / Sandbox 付款 + 本機 Supabase + 既有全部驗收）
//
// 順序：
//    1. db:verify-sync              supabase/ 與 DB SQL v2.0 規格包一致（含 0018 與 commerce_checkout_rls.sql）
//    2. db:smoke                    本機 DB：migrations、seed、SQL tests、PostgREST / GoTrue RLS
//    3. build                       產生 apps/marketing/dist 與 apps/admin/.next（後續驗收都讀這份輸出）
//    4. payment:verify              金流安全邊界（憑證未設定不 fallback、簽章、冪等、不收卡號）
//    5. commerce:verify             Commerce 資料庫 / RLS（anon 邊界、金額重算、發碼冪等、正式付款未開放）
//    6. commerce-integration:verify 端到端：加入購物車 → 下單 → Sandbox 付款 → 發碼 → 收據（真實 Supabase）
//    7. cart:verify                 購物車 / 結帳前台（noindex、只送 price id、測試價格標示、不收卡號）
//    8. cms:verify                  Phase 2.9 CMS 驗收（確認 Commerce 沒有破壞 CMS）
//    9. cms-integration:verify      Phase 2.9 內容工作流整合（真實 Supabase）
//   10. search:verify               /search 與 /search-index.json
//   11. site-settings:verify        Phase 2.8 全站設定整合（admin build 沿用第 3 步）
//   12. local-env:verify            .gitignore、service role 不進 build、無正式 key
//   13. asset:verify                圖片 / OG / Logo / Favicon（不重新 build）
//   14. seo:verify                  metadata / sitemap / robots（不重新 build）
//   15. perf:verify                 首屏資源預算（不重新 build）
//   16. global-ui:verify            浮動快捷列 / 購物車（--skip-rwd）
//   17. mockup:verify               設計稿區塊（--skip-rwd）
//   18. ui:verify                   UI / UX（--skip-rwd）
//   19. phase2:verify               phase1 / auth / lint / typecheck / build / RWD（完整 RWD 在這裡跑唯一一次）
//   20. git:verify                  Git baseline
//
// 完整 RWD（101 routes × 6 widths = 606 checks）整輪只在第 19 步跑一次；其他步驟一律 --skip-rwd。
// 第 6 步會以本機 Supabase 設定另外 build 一份後台到 apps/admin/.next-supabase，不覆蓋第 3 步的 mock build。
//
// 前置：本機 Supabase 已啟動（pnpm supabase:start）。本腳本不會 link / push 任何遠端專案，
// 也不會使用任何正式金流憑證：sandbox secret 由 commerce-integration:verify 當場隨機產生。
//
// 用法：pnpm phase30:verify [--from <step>] [--skip-rwd]
//   --skip-rwd：本輪已先執行完整 RWD 時使用，改由 rwd:report:verify 檢查報告
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './lib/servers.mjs';

const skipRwd = process.argv.includes('--skip-rwd');
const steps = [
  { label: 'db:verify-sync', command: 'pnpm db:verify-sync' },
  { label: 'db:smoke', command: 'pnpm db:smoke' },
  { label: 'build', command: 'pnpm build', env: { DATA_SOURCE: 'mock' } },
  { label: 'payment:verify', command: 'pnpm payment:verify' },
  { label: 'commerce:verify', command: 'pnpm commerce:verify' },
  { label: 'commerce-integration:verify', command: 'pnpm commerce-integration:verify' },
  { label: 'cart:verify', command: 'pnpm cart:verify --skip-build', env: { DATA_SOURCE: 'mock' } },
  { label: 'cms:verify', command: 'pnpm cms:verify' },
  { label: 'cms-integration:verify', command: 'pnpm cms-integration:verify' },
  { label: 'search:verify', command: 'pnpm search:verify' },
  { label: 'site-settings:verify', command: 'pnpm site-settings:verify --skip-admin-build' },
  { label: 'local-env:verify', command: 'pnpm local-env:verify' },
  { label: 'asset:verify', command: 'pnpm asset:verify --skip-build', env: { DATA_SOURCE: 'mock' } },
  { label: 'seo:verify', command: 'pnpm seo:verify --skip-build', env: { DATA_SOURCE: 'mock' } },
  { label: 'perf:verify', command: 'pnpm perf:verify --skip-build', env: { DATA_SOURCE: 'mock' } },
  { label: 'global-ui:verify', command: 'pnpm global-ui:verify --skip-build --skip-rwd', env: { DATA_SOURCE: 'mock' } },
  { label: 'mockup:verify', command: 'pnpm mockup:verify --skip-build --skip-rwd', env: { DATA_SOURCE: 'mock' } },
  { label: 'ui:verify', command: 'pnpm ui:verify --skip-build --skip-rwd', env: { DATA_SOURCE: 'mock' } },
  skipRwd
    ? { label: 'phase2:verify', command: 'pnpm phase2:verify --skip-rwd', env: { DATA_SOURCE: 'mock' }, includes: 'RWD 以本輪已完成的報告為證據（rwd:report:verify）' }
    : { label: 'phase2:verify', command: 'pnpm phase2:verify', env: { DATA_SOURCE: 'mock' }, includes: '完整 RWD 一次（101 routes × 6 widths）', rwd: true },
  { label: 'git:verify', command: 'pnpm git:verify' },
];

const fromIndex = process.argv.indexOf('--from');
const from = fromIndex > -1 ? process.argv[fromIndex + 1] : undefined;
const startAt = from ? steps.findIndex((step) => step.label === from) : 0;
if (startAt < 0) {
  console.error(`[phase30] unknown step "${from}". Steps: ${steps.map((step) => step.label).join(', ')}`);
  process.exit(1);
}

function timeWaitCount() {
  const result = process.platform === 'win32' ? spawnSync('netstat', ['-an', '-p', 'TCP'], { encoding: 'utf8' }) : spawnSync('netstat', ['-an'], { encoding: 'utf8' });
  return result.status === 0 ? (result.stdout.match(/TIME_WAIT/g) ?? []).length : null;
}

function runStep(step) {
  return new Promise((resolve) => {
    // DATA_SOURCE 只在明確標示的步驟設定：db / commerce / cms / site-settings 驗收自行決定本機 Supabase 連線。
    // service role 與 sandbox secret 一律不從外層傳進去：需要的步驟自己從 supabase status 讀 / 當場產生。
    const env = { ...process.env, ...(step.env ?? {}) };
    if (!step.env) delete env.DATA_SOURCE;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    delete env.PAYMENT_SANDBOX_SECRET;
    delete env.PAYMENT_SANDBOX_ENABLED;
    const child = spawn(step.command, { cwd: ROOT, shell: true, env, stdio: ['inherit', 'pipe', 'pipe'] });
    let bufferSpace = false;
    const forward = (stream) => (chunk) => {
      stream.write(chunk);
      if (/ERR_NO_BUFFER_SPACE|ENOBUFS/.test(chunk.toString())) bufferSpace = true;
    };
    child.stdout.on('data', forward(process.stdout));
    child.stderr.on('data', forward(process.stderr));
    child.on('close', (code) => resolve({ code: code ?? 1, bufferSpace }));
  });
}

const dockerOk = spawnSync('docker', ['ps', '--filter', 'name=^supabase_db_syt-official-website$', '--format', '{{.Names}}'], { encoding: 'utf8' }).stdout.trim() === 'supabase_db_syt-official-website';
if (!dockerOk) {
  console.error('[phase30] 本機 Supabase（supabase_db_syt-official-website）未啟動，請先執行 pnpm supabase:start');
  process.exit(1);
}

const summary = [];
for (const step of steps.slice(startAt)) {
  console.log(`\n━━━━ ${step.label} (${step.command}) ━━━━`);
  if (step.rwd) console.log(`[phase30] TCP TIME_WAIT before RWD: ${timeWaitCount() ?? 'unknown'}`);
  const started = Date.now();
  const { code, bufferSpace } = await runStep(step);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  summary.push({ step: step.label, ok: code === 0, bufferSpace, seconds, code });
  if (step.rwd) console.log(`[phase30] TCP TIME_WAIT after RWD: ${timeWaitCount() ?? 'unknown'}`);
  if (code !== 0) {
    if (bufferSpace) {
      console.log(
        `\n[phase30] 偵測到 ERR_NO_BUFFER_SPACE：本機 socket 暫時耗盡（TIME_WAIT ${timeWaitCount() ?? 'unknown'}），不是產品錯誤。\n` +
          `          等待 TIME_WAIT 釋放（Windows 約 2–4 分鐘）後執行：pnpm phase30:verify --from ${step.label}`,
      );
    }
    break;
  }
}

console.log('\n━━━━ Phase 3.0 verify summary ━━━━');
for (const step of steps) {
  const item = summary.find((entry) => entry.step === step.label);
  const skipped = steps.indexOf(step) < startAt;
  const label = item ? (item.ok ? 'PASS' : item.bufferSpace ? `ENV FAIL (exit ${item.code})` : `FAIL (exit ${item.code})`) : skipped ? 'SKIPPED (--from)' : 'NOT RUN';
  console.log(`${label.padEnd(18)} ${item ? `${item.seconds.padStart(7)}s` : ''.padStart(8)}  ${step.label}${step.includes ? `（含 ${step.includes}）` : ''}`);
}
const allPassed = summary.length === steps.length - startAt && summary.every((item) => item.ok);
console.log(allPassed ? `Phase 3.0 verify: ALL PASSED${startAt > 0 ? `（從 ${from} 開始）` : ''}` : 'Phase 3.0 verify: FAILED');
process.exit(allPassed ? 0 : 1);
