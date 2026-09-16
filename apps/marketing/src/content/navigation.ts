export interface NavLink {
  label: string;
  href: string;
}

/** 主選單（Phase 2.6B 依設計稿：產品服務 / 案例作品 / 部落格 / 價格方案 / 關於我們） */
export const mainNav: NavLink[] = [
  { label: '產品服務', href: '/products' },
  { label: '案例作品', href: '/cases' },
  { label: '部落格', href: '/blog' },
  { label: '價格方案', href: '/checkout' },
  { label: '關於我們', href: '/about' },
];

/** Header 右側動作：搜尋導向全站搜尋、登入導向客戶後台、立即開始導向方案頁 */
export const headerActions = {
  search: { label: '搜尋站內內容', href: '/search' },
  login: { label: '登入' },
  start: { label: '立即開始', href: '/checkout' },
};

/** Footer 連結群組（設計稿：產品服務 / 資源 / 關於我們） */
export const footerGroups: { title: string; links: NavLink[] }[] = [
  {
    title: '產品服務',
    links: [
      { label: 'SEO 形象官網', href: '/products/seo-website' },
      { label: '一頁式網頁', href: '/products/landing-page' },
      { label: '電商網站', href: '/products/ecommerce-website' },
      { label: '活動 DM / 宣傳頁', href: '/products/promo-page-design' },
      { label: 'SEO 文章工具', href: '/products/seo-article-generator' },
    ],
  },
  {
    title: '資源',
    links: [
      { label: '案例作品', href: '/cases' },
      { label: '部落格', href: '/blog' },
      { label: '解決方案', href: '/solutions' },
      { label: '價格方案', href: '/checkout' },
    ],
  },
  {
    title: '關於我們',
    links: [
      { label: '品牌故事', href: '/about' },
      { label: '聯絡我們', href: '/contact' },
      { label: 'Line@ 客製詢問', href: 'line' },
    ],
  },
];

/** 社群連結尚未開通：只顯示 placeholder，不連到不存在的帳號 */
export const socialPlaceholders = [
  { label: 'Facebook', icon: 'facebook' },
  { label: 'Instagram', icon: 'instagram' },
  { label: 'YouTube', icon: 'youtube' },
  { label: 'LINE', icon: 'message' },
] as const;

export const legalLinks: NavLink[] = [
  { label: '服務條款', href: '/legal/terms' },
  { label: '隱私權政策', href: '/legal/privacy' },
];
