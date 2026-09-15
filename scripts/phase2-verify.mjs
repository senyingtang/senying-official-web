// Phase 2 一鍵驗收：依序執行 phase1:verify → phase2:auth → lint → typecheck → build → rwd:check
// 任何一步失敗立即停止並回傳非 0。
// phase2:auth 以 --skip-phase1 --skip-rwd 執行：phase1:structure 已在 phase1:verify 內執行、rwd:check 在最後一步執行，
// 其餘 Phase 2 檢查（guard、service role、DATA_SOURCE、兌換流程、權限 runtime 測試、env leak、secret scan）全部照跑。
// phase1:verify 以 --skip-rwd 執行（Phase 2.7）：完整 RWD（前台 + 後台、6 種寬度）只在最後一步跑一次，覆蓋範圍不變。
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/servers.mjs';

const steps = [
  { label: 'phase1:verify', command: 'pnpm phase1:verify --skip-rwd' },
  { label: 'phase2:auth', command: 'pnpm phase2:auth --skip-phase1 --skip-rwd' },
  { label: 'lint', command: 'pnpm lint' },
  { label: 'typecheck', command: 'pnpm typecheck' },
  { label: 'build', command: 'pnpm build' },
  { label: 'rwd:check', command: 'pnpm rwd:check' },
];

const summary = [];
for (const step of steps) {
  console.log(`\n━━━━ ${step.label} (${step.command}) ━━━━`);
  const started = Date.now();
  const result = spawnSync(step.command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, DATA_SOURCE: 'mock' } });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = result.status === 0;
  summary.push({ step: step.label, result: ok ? 'PASS' : `FAIL (exit ${result.status})`, seconds });
  if (!ok) break;
}

console.log('\n━━━━ Phase 2 verify summary ━━━━');
for (const step of steps) {
  const item = summary.find((entry) => entry.step === step.label);
  console.log(item ? `${item.result.padEnd(14)} ${item.seconds.padStart(7)}s  ${item.step}` : `${'NOT RUN'.padEnd(14)} ${''.padStart(8)}  ${step.label}`);
}
const allPassed = summary.length === steps.length && summary.every((item) => item.result === 'PASS');
console.log(allPassed ? 'Phase 2 verify: ALL PASSED' : 'Phase 2 verify: FAILED');
process.exit(allPassed ? 0 : 1);
