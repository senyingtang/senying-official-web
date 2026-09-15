import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// 正式網址只從環境變數讀取，不寫死網域。canonical / og:url / sitemap 由 src/lib/site.ts（SITE_PUBLIC_URL）統一產生；
// 未設定時不在設定檔寫入本機網址。
const site = process.env.SITE_PUBLIC_URL?.trim().replace(/\/+$/, '') || undefined;

export default defineConfig({
  site,
  output: 'static',
  // 驗收腳本（pnpm seo:verify）以正式網址設定另外 build 到報告資料夾時使用；一般 build 固定輸出到 dist
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
