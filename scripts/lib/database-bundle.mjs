// 以 esbuild 打包真實的 @syt/database（含 mock 與 Supabase repository），讓 Node 驗收腳本使用與 app 相同的程式碼。
// 不另外安裝相依套件：esbuild 來自 Astro 內建的 vite。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MARKETING_DIR, ROOT } from './servers.mjs';

/**
 * @param {string} outDir 產出 bundle 的資料夾（報告資料夾）
 * @returns {Promise<Record<string, unknown>>} @syt/database 的 module
 */
export async function loadDatabaseBundle(outDir) {
  const databaseRequire = createRequire(path.join(ROOT, 'packages', 'database', 'package.json'));
  const astroPackage = createRequire(path.join(MARKETING_DIR, 'package.json')).resolve('astro/package.json');
  const vitePackage = createRequire(astroPackage).resolve('vite/package.json');
  const esbuild = createRequire(vitePackage)('esbuild');
  mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, 'database-bundle.mjs');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'packages', 'database', 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    external: ['@supabase/supabase-js'],
    banner: { js: `import { createRequire as __cr } from 'node:module'; const require = __cr(${JSON.stringify(path.join(ROOT, 'packages', 'database', 'package.json'))});` },
  });
  const supabaseEntry = pathToFileURL(databaseRequire.resolve('@supabase/supabase-js')).href;
  writeFileSync(outfile, readFileSync(outfile, 'utf8').replaceAll(/from ["']@supabase\/supabase-js["']/g, `from ${JSON.stringify(supabaseEntry)}`));
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

/** @syt/shared 的 markdown 工具（無 import，可直接載入 .ts） */
export function loadMarkdownModule() {
  return import(pathToFileURL(path.join(ROOT, 'packages', 'shared', 'src', 'utils', 'markdown.ts')).href);
}
