/**
 * 社群分享圖（Open Graph 1200×630 PNG，Phase 2.7）。
 * - pnpm og:generate 依本檔設定產生 apps/marketing/public/images/og/*-og-1200x630.png（HTML 樣板 → Chrome 截圖，不需人工修圖）
 * - BaseLayout 輸出 og:image / og:image:width / og:image:height / og:image:type / twitter:image
 * - 圖上文字只是分享縮圖視覺；頁面 SEO 內容（title、H1、內文、JSON-LD）一律是 HTML 文字
 * - 本檔沒有 import：產生腳本（Node）與 Astro 共用
 * - 品牌名稱在產生時讀取全站設定預設值；品牌名稱變更後需重新執行 pnpm og:generate
 */
export type OgImageKey =
  | 'default'
  | 'home'
  | 'products'
  | 'seo-website'
  | 'landing-page'
  | 'ecommerce-website'
  | 'promo-page-design'
  | 'seo-article-generator'
  | 'cases'
  | 'blog'
  | 'about'
  | 'contact'
  | 'solutions';

export interface OgImageAsset {
  key: OgImageKey;
  src: string;
  width: 1200;
  height: 630;
  type: 'image/png';
  /** og:image:alt 的主體（品牌由 formatPageTitle 統一加上） */
  label: string;
  /** 圖上小標（分類） */
  eyebrow: string;
  /** 圖上主標（每個元素一行，最多 2 行） */
  headline: string[];
  /** 圖上副標（一行） */
  subline: string;
  /** 右側示意圖：media.ts 的 WebPath（產生時使用 1080w WebP）；null 為純品牌版面 */
  visual: string | null;
}

const og = (key: OgImageKey, content: Omit<OgImageAsset, 'key' | 'src' | 'width' | 'height' | 'type'>): OgImageAsset => ({
  key,
  src: `/images/og/${key}-og-1200x630.png`,
  width: 1200,
  height: 630,
  type: 'image/png',
  ...content,
});

export const ogImages = {
  default: og('default', {
    label: '網站設計、電商建置與 SEO 數位工具',
    eyebrow: '網站設計・電商建置・SEO 數位工具',
    headline: ['把網站和內容，', '做成真的能用的產品'],
    subline: '自助建站・客製網站・SEO 內容管理',
    visual: null,
  }),
  home: og('home', {
    label: '網站設計、電商建置與 SEO 數位工具',
    eyebrow: '自助建站平台',
    headline: ['網站設計、電商建置', '與 SEO 數位工具'],
    subline: '形象官網・一頁式網頁・電商・SEO 文章',
    visual: '/images/hero/home-hero-platform-ui-final.png',
  }),
  products: og('products', {
    label: '產品服務',
    eyebrow: '產品服務',
    headline: ['依目的選擇產品，', '開始建立網站'],
    subline: '五種數位產品，一個後台管理',
    visual: '/images/templates/template-showcase-devices-final.png',
  }),
  'seo-website': og('seo-website', {
    label: 'SEO 形象官網',
    eyebrow: '產品服務',
    headline: ['SEO 形象官網'],
    subline: '模板建站・後台自行更新內容',
    visual: '/images/products/seo-website/seo-website-hero-final.png',
  }),
  'landing-page': og('landing-page', {
    label: '一頁式網頁',
    eyebrow: '產品服務',
    headline: ['一頁式網頁'],
    subline: '團購・活動報名・課程招生・預約',
    visual: '/images/products/landing-page/landing-page-hero-final.png',
  }),
  'ecommerce-website': og('ecommerce-website', {
    label: '電商網站',
    eyebrow: '產品服務',
    headline: ['電商網站'],
    subline: '商品展示・結帳流程・金流規劃',
    visual: '/images/products/ecommerce-website/ecommerce-website-hero-final.png',
  }),
  'promo-page-design': og('promo-page-design', {
    label: '活動 DM / 宣傳頁面設計',
    eyebrow: '產品服務',
    headline: ['活動 DM', '宣傳頁面設計'],
    subline: '社群圖・活動頁・印刷版本',
    visual: '/images/products/promo-page-design/promo-page-design-hero-final.png',
  }),
  'seo-article-generator': og('seo-article-generator', {
    label: 'SEO 文章生產器',
    eyebrow: '產品服務',
    headline: ['SEO 文章生產器'],
    subline: 'SEO 標題・H2/H3・FAQ Schema',
    visual: '/images/products/seo-article-generator/seo-article-generator-hero-final.png',
  }),
  cases: og('cases', {
    label: '案例作品',
    eyebrow: '案例作品',
    headline: ['用數位創意，', '成就更多可能'],
    subline: '形象官網・電商・活動頁的做法整理',
    visual: '/images/cases/case-visual-final.png',
  }),
  blog: og('blog', {
    label: '部落格',
    eyebrow: '部落格',
    headline: ['網站經營與', 'SEO 內容筆記'],
    subline: 'SEO・網站設計・內容行銷',
    visual: '/images/blog/blog-visual-final.png',
  }),
  about: og('about', {
    label: '關於森映',
    eyebrow: '關於我們',
    headline: ['把建站與內容需求', '整理成產品'],
    subline: '自助建站・客製・人工協助',
    visual: '/images/backgrounds/mountain-bright-bg-final.png',
  }),
  contact: og('contact', {
    label: '聯絡我們',
    eyebrow: '聯絡我們',
    headline: ['聊聊你的', '網站需求'],
    subline: 'LINE@・需求表單・客製報價',
    visual: '/images/ui-mockups/admin-dashboard-seo-score-final.png',
  }),
  solutions: og('solutions', {
    label: '解決方案',
    eyebrow: '解決方案',
    headline: ['先確認情境，', '再決定網站怎麼做'],
    subline: '新品牌・舊站翻新・SEO 內容・活動轉換',
    visual: '/images/templates/template-showcase-devices-final.png',
  }),
} satisfies Record<OgImageKey, OgImageAsset>;

/** 產品頁 OG 圖（依產品 slug） */
export const productOgImages: Record<string, OgImageAsset> = {
  'seo-website': ogImages['seo-website'],
  'landing-page': ogImages['landing-page'],
  'ecommerce-website': ogImages['ecommerce-website'],
  'promo-page-design': ogImages['promo-page-design'],
  'seo-article-generator': ogImages['seo-article-generator'],
};
