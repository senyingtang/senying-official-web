import { mediaAssets, type MarketingImageAsset } from './media';
import type { ChipItem, IconName, TimelineStep } from './types';

/** 產品總覽頁（Phase 2.6B 依 mockup-products-overview-page） */
export const productsHero = {
  eyebrow: '選對數位工具，讓成長更簡單',
  title: '找到最適合你的數位產品，實現業務成長',
  highlight: '業務成長',
  lead: '森映提供從品牌官網、活動頁到電商與 SEO 工具的產品組合，協助不同規模的品牌，用對的工具達成目標。',
  primary: { label: '諮詢適合的方案', href: '/contact' },
  secondary: { label: '看案例作品', href: '/cases' },
  badges: ['網站建置 × 行銷推廣', '依目的選擇產品'],
  script: 'Digital Products For Your Growth',
};

export const productFilterChips: ChipItem[] = [
  { key: 'all', label: '全部產品' },
  { key: 'website', label: '網站建置' },
  { key: 'commerce', label: '電商方案' },
  { key: 'marketing', label: '行銷推廣' },
  { key: 'seo', label: 'SEO 工具' },
];

export interface OverviewProductCard {
  slug: string;
  name: string;
  path: string;
  icon: IconName;
  tagline: string;
  points: string[];
  /** 價格狀態：不寫 NT$ 金額，正式價格以確認報價為準 */
  priceDisplay: string;
  filterTags: string[];
  image: MarketingImageAsset;
}

export const overviewProducts: OverviewProductCard[] = [
  {
    slug: 'seo-website',
    name: 'SEO 形象官網',
    path: '/products/seo-website',
    icon: 'layout',
    tagline: '建立品牌形象，提升搜尋能見度',
    points: ['適合中小企業・品牌商家', '每頁 SEO 欄位・內容自行更新', '響應式版型・手機優先'],
    priceDisplay: '方案整理中',
    filterTags: ['website', 'seo'],
    image: mediaAssets.seoWebsiteHero,
  },
  {
    slug: 'landing-page',
    name: '一頁式網頁',
    path: '/products/landing-page',
    icon: 'file',
    tagline: '快速上線，聚焦行動',
    points: ['適合活動推廣・新創團隊', '重點說明・快速製作', '報名 / 預約表單'],
    priceDisplay: '方案整理中',
    filterTags: ['website', 'marketing'],
    image: mediaAssets.landingPageHero,
  },
  {
    slug: 'ecommerce-website',
    name: '電商網站',
    path: '/products/ecommerce-website',
    icon: 'cart',
    tagline: '打造專屬線上商店',
    points: ['適合品牌電商・零售業', '金流串接依專案需求確認', '商品與訂單後台規劃'],
    priceDisplay: '客製報價',
    filterTags: ['commerce', 'website'],
    image: mediaAssets.ecommerceHero,
  },
  {
    slug: 'promo-page-design',
    name: '活動 DM / 宣傳頁',
    path: '/products/promo-page-design',
    icon: 'megaphone',
    tagline: '讓活動被更多人看見',
    points: ['適合展覽・課程・活動主辦', '社群・網頁・印刷多尺寸', '整合報名與 LINE@ 導流'],
    priceDisplay: '客製報價',
    filterTags: ['marketing'],
    image: mediaAssets.promoPageHero,
  },
  {
    slug: 'seo-article-generator',
    name: 'SEO 文章工具',
    path: '/products/seo-article-generator',
    icon: 'pen',
    tagline: '用結構一致的文章經營內容',
    points: ['適合內容行銷・企業', 'AI 草稿・人工審稿', '關鍵字與 FAQ 結構'],
    priceDisplay: '開放前登記',
    filterTags: ['seo', 'marketing'],
    image: mediaAssets.seoArticleGeneratorHero,
  },
];

export const comparisonColumns = overviewProducts.map((product) => ({ key: product.slug, label: product.name, icon: product.icon, href: product.path }));

/** 比較表：「✓」代表支援；價格區間只寫狀態 */
export const comparisonRows: { label: string; values: string[] }[] = [
  { label: '適合對象', values: ['企業・品牌商家', '活動・新創團隊', '電商・零售業', '展覽・課程・活動', '內容行銷・企業'] },
  { label: '頁面數量', values: ['多頁（依版型）', '單頁', '多頁（含商品頁）', '單頁 / 多尺寸', '—'] },
  { label: '金流 / 會員', values: ['—', '第一版以表單為主', '依專案需求確認', '—', '—'] },
  { label: 'SEO 優化', values: ['✓', '基礎設定', '✓', '基礎設定', '✓（AI 草稿）'] },
  { label: '製作時間', values: ['依內容準備進度', '依內容準備進度', '報價時確認', '報價時確認', '內部使用中'] },
  { label: '價格區間', values: overviewProducts.map((product) => product.priceDisplay) },
];

export const productAudiences: { slug: string; name: string; icon: IconName; items: string[] }[] = [
  { slug: 'seo-website', name: 'SEO 形象官網', icon: 'layout', items: ['中小企業', '品牌商家', '專業服務業', '希望長期經營品牌者'] },
  { slug: 'landing-page', name: '一頁式網頁', icon: 'file', items: ['活動推廣', '新創團隊', '個人品牌', '需要快速上線者'] },
  { slug: 'ecommerce-website', name: '電商網站', icon: 'cart', items: ['電商品牌', '零售業', '實體轉線上', '需要金流與會員系統'] },
  { slug: 'promo-page-design', name: '活動 DM / 宣傳頁', icon: 'megaphone', items: ['展覽活動主辦', '課程講座', '新品發表', '需要短期曝光者'] },
  { slug: 'seo-article-generator', name: 'SEO 文章工具', icon: 'pen', items: ['內容行銷團隊', '行銷顧問公司', '中小企業', '希望經營自然搜尋者'] },
];

export const quickStartSteps: TimelineStep[] = [
  { icon: 'box', title: '選擇產品', description: '依需求挑選產品，或預約專人諮詢' },
  { icon: 'file', title: '確認需求', description: '討論細節、提供素材，確認報價與時程' },
  { icon: 'rocket', title: '開始製作', description: '自助建站或由團隊製作，上線前後都能詢問' },
];

export const productsFinalCta = {
  title: '準備好選擇你的數位產品了嗎？',
  description: '說明你的目標與目前的素材，我們協助挑選適合的產品。',
  primary: { label: '預約討論', href: '/contact' },
  secondary: { label: 'Line@ 線上詢問', href: 'line' },
  script: '好的工具，成就更大的未來',
};
