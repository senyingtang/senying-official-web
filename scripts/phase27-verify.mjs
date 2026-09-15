// Phase 2.7 一鍵驗收（final full verify）
//
// 順序：asset:verify（含 build）→ seo:verify → perf:verify → global-ui:verify → mockup:verify → ui:verify → phase2:verify
//
// RWD / socket 最佳化（覆蓋範圍不變）：
//   - asset / seo / perf 只讀靜態 build output，不啟動服務
//   - global-ui / mockup / ui 以 --skip-build --skip-rwd 執行（它們原本各跑一次 pnpm rwd:check marketing）
//   - phase2:verify 內的 phase1:verify 以 --skip-rwd 執行
//   → 完整 RWD（前台 + 後台、375 / 430 / 768 / 1024 / 1280 / 1440）整輪只在 phase2:verify 最後一步跑一次，
//     涵蓋上述所有 marketing RWD 頁面，不會重複跑 4–5 次
//   - 進入 RWD 前後顯示 TCP TIME_WAIT 數量；若輸出出現 ERR_NO_BUFFER_SPACE，標示為本機 socket 耗盡，不是產品錯誤
//
// 用法：
//   pnpm phase27:verify                 完整驗收
//   pnpm phase27:verify --from ui:verify 從某一步開始（例如 socket 耗盡後重跑）
//   pnpm phase27:static                 只跑 asset + seo + perf（targeted，無 RWD）
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './lib/servers.mjs';

const steps = [
  { label: 'asset:verify', command: 'pnpm asset:verify' },
  { label: 'seo:verify', command: 'pnpm seo:verify --skip-build' },
  { label: 'perf:verify', command: 'pnpm perf:verify --skip-build' },
  { label: 'global-ui:verify', command: 'pnpm global-ui:verify --skip-build --skip-rwd' },
  { label: 'mockup:verify', command: 'pnpm mockup:verify --skip-build --skip-rwd' },
  { label: 'ui:verify', command: 'pnpm ui:verify --skip-build --skip-rwd' },
  { label: 'phase2:verify', command: 'pnpm phase2:verify', rwd: true },
];

const fromIndex = process.argv.indexOf('--from');
const from = fromIndex > -1 ? process.argv[fromIndex + 1] : undefined;
const startAt = from ? steps.findIndex((step) => step.label === from) : 0;
if (startAt < 0) {
  console.error(`[phase27] unknown step "${from}". Steps: ${steps.map((step) => step.label).join(', ')}`);
  process.exit(1);
}

function timeWaitCount() {
  const result = process.platform === 'win32' ? spawnSync('netstat', ['-an', '-p', 'TCP'], { encoding: 'utf8' }) : spawnSync('netstat', ['-an'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return (result.stdout.match(/TIME_WAIT/g) ?? []).length;
}

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, { cwd: ROOT, shell: true, env: { ...process.env, DATA_SOURCE: 'mock' }, stdio: ['inherit', 'pipe', 'pipe'] });
    let bufferSpace = false;
    const forward = (stream) => (chunk) => {
      stream.write(chunk);
      if (/ERR_NO_BUFFER_SPACE|ENOBUFS/.test(chunk.toString())) bufferSpace = true;
    };
    child.stdout.on('data', forward(process.stdout));
    child.stderr.on('data', forward(process.stderr));
    child.on('close', (code) => resolve({ code, bufferSpace }));
  });
}

const summary = [];
for (const step of steps.slice(startAt)) {
  console.log(`\n━━━━ ${step.label} (${step.command}) ━━━━`);
  if (step.rwd) console.log(`[phase27] TCP TIME_WAIT before RWD: ${timeWaitCount() ?? 'unknown'}`);
  const started = Date.now();
  const { code, bufferSpace } = await runStep(step);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = code === 0;
  summary.push({ step: step.label, result: ok ? 'PASS' : bufferSpace ? `ENV FAIL (exit ${code})` : `FAIL (exit ${code})`, seconds });
  if (step.rwd) console.log(`[phase27] TCP TIME_WAIT after RWD: ${timeWaitCount() ?? 'unknown'}`);
  if (!ok) {
    if (bufferSpace) {
      console.log(
        `\n[phase27] 偵測到 ERR_NO_BUFFER_SPACE：本機 socket 暫時耗盡（TIME_WAIT ${timeWaitCount() ?? 'unknown'}），不是產品錯誤。\n` +
          `          請確認沒有殘留的 node / chrome process，等待 TIME_WAIT 釋放（Windows 約 2–4 分鐘）後執行：pnpm phase27:verify --from ${step.label}`,
      );
    }
    break;
  }
}

console.log('\n━━━━ Phase 2.7 verify summary ━━━━');
for (const step of steps) {
  const item = summary.find((entry) => entry.step === step.label);
  const skipped = steps.indexOf(step) < startAt;
  console.log(item ? `${item.result.padEnd(18)} ${item.seconds.padStart(7)}s  ${item.step}` : `${(skipped ? 'SKIPPED (--from)' : 'NOT RUN').padEnd(18)} ${''.padStart(8)}  ${step.label}`);
}
const allPassed = summary.length === steps.length - startAt && summary.every((item) => item.result === 'PASS');
console.log(allPassed ? `Phase 2.7 verify: ALL PASSED${startAt > 0 ? `（從 ${from} 開始）` : ''}` : 'Phase 2.7 verify: FAILED');
process.exit(allPassed ? 0 : 1);
