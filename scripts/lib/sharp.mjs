// 圖片處理用 sharp（Phase 2.7 圖片轉檔 / OG / favicon / 驗收共用）
// sharp 是 astro 的相依套件（Astro 圖片服務），先嘗試直接載入，找不到時從 apps/marketing 的 astro 位置解析，
// 避免為了轉檔在離線環境新增套件。
import { createRequire } from 'node:module';
import path from 'node:path';
import { MARKETING_DIR, ROOT } from './servers.mjs';

export function loadSharp() {
  const attempts = [
    () => createRequire(path.join(ROOT, 'package.json'))('sharp'),
    () => {
      const astroPackage = createRequire(path.join(MARKETING_DIR, 'package.json')).resolve('astro/package.json');
      return createRequire(astroPackage)('sharp');
    },
  ];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // 試下一個位置
    }
  }
  throw new Error('找不到 sharp：請先在專案根目錄執行 pnpm install（sharp 由 astro 相依安裝）。');
}
