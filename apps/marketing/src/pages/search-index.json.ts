import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/search-index';

/**
 * 全站搜尋索引（build 時產生的靜態檔案，輸出為 /search-index.json）。
 * 由 /search 在瀏覽器端載入後比對，不會把每次輸入送到伺服器，也不依賴任何外部搜尋服務。
 */
export const GET: APIRoute = async () => {
  const entries = await buildSearchIndex();
  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), count: entries.length, entries }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
