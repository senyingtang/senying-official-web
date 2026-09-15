// Phase 1 一鍵驗收：依序執行，任何一步失敗立即停止並回傳非 0
// --skip-rwd：由上層驗收（phase2:verify）在最後統一執行同一個 pnpm rwd:check，避免同一輪重複跑完整 RWD
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/servers.mjs';

const skipRwd = process.argv.includes('--skip-rwd');
const steps = [
  { label: 'pnpm phase1:structure', command: 'pnpm phase1:structure' },
  { label: 'pnpm db:verify-sync', command: 'pnpm db:verify-sync' },
  { label: 'pnpm lint', command: 'pnpm lint' },
  { label: 'pnpm typecheck', command: 'pnpm typecheck' },
  { label: 'pnpm build', command: 'pnpm build' },
  // build 完成後再做一次「source route + build output」雙重驗證，缺少或過期的 build output 直接失敗
  { label: 'pnpm phase1:structure --require-build', command: 'pnpm phase1:structure --require-build' },
  ...(skipRwd ? [] : [{ label: 'pnpm rwd:check', command: 'pnpm rwd:check' }]),
];

const summary = [];
for (const step of steps) {
  console.log(`\n━━━━ ${step.label} ━━━━`);
  const started = Date.now();
  const result = spawnSync(step.command, { cwd: ROOT, stdio: 'inherit', shell: true });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = result.status === 0;
  summary.push({ step: step.label, result: ok ? 'PASS' : `FAIL (exit ${result.status})`, seconds });
  if (!ok) break;
}

console.log('\n━━━━ Phase 1 verify summary ━━━━');
for (const item of summary) console.log(`${item.result.padEnd(14)} ${item.seconds.padStart(7)}s  ${item.step}`);
const allPassed = summary.length === steps.length && summary.every((item) => item.result === 'PASS');
console.log(allPassed ? 'Phase 1 verify: ALL PASSED' : 'Phase 1 verify: FAILED');
process.exit(allPassed ? 0 : 1);
