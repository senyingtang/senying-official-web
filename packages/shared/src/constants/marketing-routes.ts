/**
 * 官網固定頁面清單（Phase 2.9）。
 *
 * 唯一用途：後台「頁面管理 / SEO 管理」要列出哪些 route，以及全站搜尋要收錄哪些固定頁。
 * ⚠️ 這裡不是 SEO 資料來源：每頁的 title / description / canonical 仍由該頁自己的 BaseLayout seo 設定產生，
 *    per-entity 覆寫則存在 seo_metadata。這裡只保存「route、頁面名稱、用途說明、是否可被索引」。
 *
 * 本檔沒有任何 import：Astro 前台、Next.js 後台與 Node 驗收腳本都可以直接載入。
 */

export type MarketingRouteGroup = 'main' | 'product' | 'content' | 'legal';

export interface MarketingRouteInfo {
  route: string;
  /** 後台與搜尋結果顯示的頁面名稱 */
  name: string;
  /** 搜尋結果摘要 / 後台說明（不是 meta description） */
  purpose: string;
  group: MarketingRouteGroup;
  /** false：頁面本身設定 noindex（例如結帳頁），不進 sitemap、不進搜尋索引 */
  indexable: boolean;
  keywords: string[];
}

export const MARKETING_ROUTES: readonly MarketingRouteInfo[] = [
  { route: '/', name: '首頁', purpose: '森映 SEN YING 官網首頁：網站設計、電商建置與 SEO 數位工具總覽。', group: 'main', indexable: true, keywords: ['首頁', '森映', 'SEN YING', '官網'] },
  { route: '/products', name: '產品總覽', purpose: '五個產品的比較與適用情境：SEO 形象官網、一頁式網頁、電商網站、活動宣傳頁、SEO 文章生產器。', group: 'main', indexable: true, keywords: ['產品', '方案', '服務', '比較'] },
  { route: '/products/seo-website', name: 'SEO 形象官網', purpose: '品牌形象官網：頁面架構、SEO 欄位與後台自行更新內容。', group: 'product', indexable: true, keywords: ['SEO', '形象官網', '品牌官網', '企業網站'] },
  { route: '/products/landing-page', name: '一頁式網頁', purpose: '活動、課程與單一服務的一頁式網頁，含報名與表單。', group: 'product', indexable: true, keywords: ['一頁式', 'landing page', '活動頁', '報名'] },
  { route: '/products/ecommerce-website', name: '電商網站', purpose: '商品展示、購物流程與訂單管理的品牌電商網站。', group: 'product', indexable: true, keywords: ['電商', '購物', '訂單', '金流'] },
  { route: '/products/promo-page-design', name: '活動 DM / 宣傳頁面設計', purpose: '活動 DM、宣傳頁與社群圖像的版面設計。', group: 'product', indexable: true, keywords: ['DM', '宣傳頁', '活動', '設計'] },
  { route: '/products/seo-article-generator', name: 'SEO 文章生產器', purpose: '以品牌設定與關鍵字產生 SEO 文章草稿的工具。', group: 'product', indexable: true, keywords: ['SEO', '文章', '生產器', 'AI', '內容'] },
  { route: '/solutions', name: '解決方案', purpose: '依產業與需求整理的網站解決方案組合。', group: 'main', indexable: true, keywords: ['解決方案', '產業', '需求'] },
  { route: '/cases', name: '案例作品', purpose: '不同產業的網站需求、做法與使用產品整理。', group: 'content', indexable: true, keywords: ['案例', '作品', '實績'] },
  { route: '/blog', name: '部落格', purpose: 'SEO 優化、網站設計、內容行銷與品牌經營的實作筆記。', group: 'content', indexable: true, keywords: ['部落格', '文章', 'SEO', '內容行銷'] },
  { route: '/about', name: '關於我們', purpose: '森映的品牌介紹、做事方式與服務範圍。', group: 'main', indexable: true, keywords: ['關於', '品牌', '團隊', '森映'] },
  { route: '/contact', name: '聯絡我們', purpose: '網站建置、電商與客製需求的詢問與報價聯絡方式。', group: 'main', indexable: true, keywords: ['聯絡', '詢問', '報價', '諮詢'] },
  { route: '/cart', name: '購物車', purpose: '購物車內容與數量調整（頁面為 noindex，不收錄於搜尋與 sitemap）。', group: 'main', indexable: false, keywords: ['購物車', '結帳'] },
  { route: '/checkout', name: '結帳', purpose: '確認購物車、填寫訂購資料並選擇付款方式（頁面為 noindex，不收錄於搜尋與 sitemap）。', group: 'main', indexable: false, keywords: ['結帳', '付款', '方案', '權限代碼'] },
  { route: '/legal/terms', name: '服務條款', purpose: '森映自助建站平台服務條款。', group: 'legal', indexable: true, keywords: ['條款', '服務條款', '法律'] },
  { route: '/legal/privacy', name: '隱私權政策', purpose: '森映自助建站平台隱私權政策。', group: 'legal', indexable: true, keywords: ['隱私', '個資', '政策'] },
];

/** 後台「頁面管理」顯示順序：首頁 → 產品總覽 → 5 產品 → 解決方案 → 案例 → 文章 → 關於 → 聯絡 → 其他 */
export const CMS_MANAGED_ROUTES: readonly string[] = [
  '/',
  '/products',
  '/products/seo-website',
  '/products/landing-page',
  '/products/ecommerce-website',
  '/products/promo-page-design',
  '/products/seo-article-generator',
  '/solutions',
  '/cases',
  '/blog',
  '/about',
  '/contact',
];

export function findMarketingRoute(route: string): MarketingRouteInfo | null {
  const normalized = route.replace(/\/+$/, '') || '/';
  return MARKETING_ROUTES.find((item) => item.route === normalized) ?? null;
}

/** 搜尋索引可收錄的固定頁（排除 noindex 頁） */
export const SEARCHABLE_MARKETING_ROUTES = MARKETING_ROUTES.filter((item) => item.indexable);
