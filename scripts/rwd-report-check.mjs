// 檢查最近一次完整 RWD 報告（.rwd-report/report-all.json）是否可作為本輪驗收證據
//
// 用於 `pnpm phase28:verify --skip-rwd`：同一輪驗收只跑一次完整 RWD（由 phase2:verify 執行），
// 後續 aggregate 不重跑，但必須確認報告是完整的 528 checks、0 failures、且是近期產生。
//
// 條件：checks = 88 pages × 6 widths = 528、failures = 0、checkedAt 在 RWD_REPORT_MAX_AGE_HOURS（預設 6）小時內、
//       若有 retry 紀錄，每筆 finalResult 必須是 PASS
// 用法：pnpm rwd:report:verify
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/servers.mjs';
import { createReport } from './lib/static-site.mjs';

const report = createReport('RWD report evidence');
const file = path.join(ROOT, '.rwd-report', 'report-all.json');
const maxAgeHours = Number(process.env.RWD_REPORT_MAX_AGE_HOURS ?? 6);

if (!existsSync(file)) {
  report.record(1, '.rwd-report/report-all.json 存在', false, '請先執行 pnpm rwd:check 或 pnpm phase2:verify');
  report.finish('rwd:report:verify');
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const ageHours = (Date.now() - Date.parse(data.checkedAt)) / 3_600_000;
const retries = Array.isArray(data.retries) ? data.retries : [];
report.record(1, '完整 RWD：88 pages × 6 widths = 528 checks', data.checks === 528 && data.pages?.length === 88 && data.widths?.length === 6, `checks=${data.checks} pages=${data.pages?.length} widths=${data.widths?.join('/')}`);
report.record(2, 'failures = 0', Array.isArray(data.failures) && data.failures.length === 0, `failures=${data.failures?.length}`);
report.record(3, `報告在 ${maxAgeHours} 小時內產生`, Number.isFinite(ageHours) && ageHours >= 0 && ageHours <= maxAgeHours, `checkedAt=${data.checkedAt}（${ageHours.toFixed(2)}h ago）`);
report.record(4, 'retry（僅限暫時性 socket 錯誤）最終結果皆 PASS', retries.every((item) => item.finalResult === 'PASS'), `retries=${retries.length} concurrency=${data.concurrency ?? '-'}`);
report.finish('rwd:report:verify');
