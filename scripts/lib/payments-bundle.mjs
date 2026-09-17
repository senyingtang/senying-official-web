// Phase 3.0：以 esbuild 打包後台的金流 adapter（apps/admin/src/lib/payments），
// 讓 Node 驗收腳本能直接驗證「未設定憑證 → 不可 fallback 成假成功」與簽章實作。
//
// 只打包 providers / signatures / types：service.ts 需要 service role client 與 Supabase 連線，
// 由 commerce-integration:verify 以真實流程驗證，不在這裡載入。
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADMIN_DIR, MARKETING_DIR, ROOT } from './servers.mjs';

function loadEsbuild() {
  const astroPackage = createRequire(path.join(MARKETING_DIR, 'package.json')).resolve('astro/package.json');
  const vitePackage = createRequire(astroPackage).resolve('vite/package.json');
  return createRequire(vitePackage)('esbuild');
}

/**
 * @param {string} outDir 產出 bundle 的資料夾（報告資料夾）
 * @returns {Promise<Record<string, unknown>>} providers + signatures 的 module
 */
export async function loadPaymentsBundle(outDir) {
  const esbuild = loadEsbuild();
  mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, 'payments-bundle.mjs');
  await esbuild.build({
    stdin: {
      contents: `export * from ${JSON.stringify(path.join(ADMIN_DIR, 'src', 'lib', 'payments', 'providers.ts').split(path.sep).join('/'))};
export * from ${JSON.stringify(path.join(ADMIN_DIR, 'src', 'lib', 'payments', 'signatures.ts').split(path.sep).join('/'))};
export { sanitizePayload } from ${JSON.stringify(path.join(ADMIN_DIR, 'src', 'lib', 'payments', 'types.ts').split(path.sep).join('/'))};`,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    // 'server-only' 只是 build-time 護欄，在 Node 驗收中以空模組取代
    plugins: [
      {
        name: 'stub-server-only',
        setup(build) {
          build.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'stub' }));
          build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export {};', loader: 'js' }));
        },
      },
    ],
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}
