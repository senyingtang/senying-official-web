import type { ChipItem, Feature, IconFeature, LinkItem, MockVisual, PosterVisual, StatItem } from './types';

export interface CaseMetric {
  label: string;
  value: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  clientLabel: string;
  industry: string;
  need: string;
  summary: string;
  products: LinkItem[];
  /** 成效指標 placeholder：不放未經確認的數字 */
  metrics: CaseMetric[];
  status: string;
  visual?: MockVisual;
  poster?: PosterVisual;
  cta: LinkItem;
  /** 對應 caseCategories 的 key */
  categories: string[];
  /** true：版型 / 設計方向示意，不是客戶專案 */
  sample?: boolean;
}

export const CASE_METRIC_NOTE = '畫面截圖與成效數據取得授權、完成統計後才會公開，目前以「整理中」標示，不放未經確認的數字。';
export const CASE_RESULTS_NOTE = '示意版面，正式案例數據待確認';

export const caseCategories: ChipItem[] = [
  { key: 'all', label: '全部案例' },
  { key: 'brand', label: '品牌官網' },
  { key: 'commerce', label: '電商購物' },
  { key: 'event', label: '活動行銷' },
  { key: 'landing', label: '一頁式網頁' },
  { key: 'content', label: 'SEO 工具' },
  { key: 'design', label: '設計宣傳' },
];

export const cases: CaseStudy[] = [
  {
    slug: 'hungjui-brand-site',
    title: 'Hungjui 形象官網',
    clientLabel: 'Hungjui',
    industry: '品牌形象官網',
    need: '需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。',
    summary: '以 SEO 形象官網架構整理首頁、服務、關於與聯絡頁，每頁設定獨立的 SEO 欄位與 FAQ。',
    products: [{ label: 'SEO 形象官網', href: '/products/seo-website' }],
    metrics: [
      { label: '上線時程', value: '整理中' },
      { label: '表單詢問', value: '整理中' },
      { label: '自然搜尋', value: '整理中' },
    ],
    status: '案例整理中',
    visual: 'website',
    cta: { label: '看 SEO 形象官網', href: '/products/seo-website' },
    categories: ['brand'],
  },
  {
    slug: 'mori-ecommerce',
    title: '品牌電商官網',
    clientLabel: '電商品牌客戶',
    industry: '品牌電商',
    need: '商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。',
    summary: '規劃商品分類、結帳流程與訂單後台，並預留綠界與 LINE Pay 的串接方式。',
    products: [{ label: '電商網站', href: '/products/ecommerce-website' }],
    metrics: [
      { label: '商品上架', value: '整理中' },
      { label: '訂單流程', value: '整理中' },
      { label: '轉換表現', value: '整理中' },
    ],
    status: '案例整理中',
    visual: 'ecommerce',
    cta: { label: '看電商網站', href: '/products/ecommerce-website' },
    categories: ['commerce'],
  },
  {
    slug: 'seo-article-generator',
    title: 'SEO 文章生產器',
    clientLabel: '森映內部工具',
    industry: '內容經營',
    need: '文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。',
    summary: '把品牌資料、關鍵字與語氣設定整理成流程，產出含 FAQ Schema 的文章草稿，再由人工審稿。',
    products: [{ label: 'SEO 文章生產器', href: '/products/seo-article-generator' }],
    metrics: [
      { label: '草稿產出', value: '內部測試中' },
      { label: '審稿時間', value: '整理中' },
      { label: '收錄狀況', value: '整理中' },
    ],
    status: '內部使用中',
    visual: 'article',
    cta: { label: '看文章生產器', href: '/products/seo-article-generator' },
    categories: ['content'],
  },
  {
    slug: 'booking-event-pages',
    title: '預約 / 活動頁',
    clientLabel: '示範版型',
    industry: '美業預約 · 活動報名',
    need: '預約和報名都靠私訊，時段與人數要一筆一筆整理。',
    summary: '以一頁式網頁版型示範預約表單與活動報名流程，資料集中在後台表單紀錄。',
    products: [
      { label: '一頁式網頁', href: '/products/landing-page' },
      { label: '預約表單頁', href: '/products/landing-page/booking-form' },
    ],
    metrics: [
      { label: '表單欄位', value: '示範' },
      { label: '預約紀錄', value: '示範' },
      { label: '上線時程', value: '示範' },
    ],
    status: '示範案例',
    visual: 'landing',
    cta: { label: '看一頁式網頁', href: '/products/landing-page' },
    categories: ['landing', 'event'],
  },
  {
    slug: 'sample-lodging-site',
    title: '山景旅宿官網版型',
    clientLabel: '版型示意',
    industry: '旅宿觀光',
    need: '房型、交通與預約資訊分散在社群，旅客很難一次看懂。',
    summary: '以形象官網版型整理房型介紹、周邊景點與預約入口。',
    products: [{ label: 'SEO 形象官網', href: '/products/seo-website' }],
    metrics: [],
    status: '版型示意',
    poster: { headline: '山海之間', sub: '旅宿觀光・形象官網', theme: 'teal' },
    cta: { label: '看 SEO 形象官網', href: '/products/seo-website' },
    categories: ['brand'],
    sample: true,
  },
  {
    slug: 'sample-festival-dm',
    title: '節慶活動 DM 視覺',
    clientLabel: '設計示意',
    industry: '百貨零售',
    need: '同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。',
    summary: '先整理活動資訊，再延伸社群、網頁與印刷尺寸。',
    products: [{ label: '活動 DM / 宣傳頁', href: '/products/promo-page-design' }],
    metrics: [],
    status: '設計示意',
    poster: { headline: '新春檔期', sub: '百貨零售・活動 DM', theme: 'red' },
    cta: { label: '看宣傳頁設計', href: '/products/promo-page-design' },
    categories: ['design', 'event'],
    sample: true,
  },
  {
    slug: 'sample-course-landing',
    title: '課程招生一頁式版型',
    clientLabel: '版型示意',
    industry: '教育培訓',
    need: '課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。',
    summary: '以課程招生頁型安排大綱、講師、FAQ 與報名表單。',
    products: [{ label: '課程招生頁', href: '/products/landing-page/course-enrollment' }],
    metrics: [],
    status: '版型示意',
    poster: { headline: '從學習開始', sub: '教育培訓・課程招生', theme: 'blue' },
    cta: { label: '看課程招生頁', href: '/products/landing-page/course-enrollment' },
    categories: ['landing'],
    sample: true,
  },
  {
    slug: 'sample-select-shop',
    title: '生活選物電商版型',
    clientLabel: '版型示意',
    industry: '生活居家',
    need: '商品規格多，希望分類清楚、手機也好瀏覽。',
    summary: '以電商版型規劃商品分類、規格說明與購物車入口。',
    products: [{ label: '電商網站', href: '/products/ecommerce-website' }],
    metrics: [],
    status: '版型示意',
    poster: { headline: '日常選物', sub: '生活居家・電商版型', theme: 'green' },
    cta: { label: '看電商網站', href: '/products/ecommerce-website' },
    categories: ['commerce'],
    sample: true,
  },
];

/** 精選案例成果：沿用設計稿版面，數值一律使用狀態文字 */
export const caseResults: StatItem[] = [
  { icon: 'trend', value: '整理中', label: '官網詢問數', note: 'Hungjui 形象官網' },
  { icon: 'cart', value: '整理中', label: '電商訂單流程', note: '品牌電商官網' },
  { icon: 'users', value: '內部測試中', label: '文章草稿產出', note: 'SEO 文章生產器' },
  { icon: 'calendar', value: '示範', label: '預約表單紀錄', note: '預約 / 活動頁' },
];

export const caseIndustries: IconFeature[] = [
  { icon: 'mountain', title: '旅宿觀光', description: '' },
  { icon: 'cart', title: '零售電商', description: '' },
  { icon: 'building', title: '企業品牌', description: '' },
  { icon: 'medical', title: '醫療健康', description: '' },
  { icon: 'graduation', title: '教育培訓', description: '' },
  { icon: 'factory', title: '製造工業', description: '' },
  { icon: 'utensils', title: '餐飲美食', description: '' },
  { icon: 'calendar', title: '活動展演', description: '' },
  { icon: 'cpu', title: '科技新創', description: '' },
  { icon: 'grid', title: '其他產業', description: '' },
];

export const casePrinciples: Feature[] = [
  { title: '只放可以驗證的資訊', description: '需求、做法與使用產品都以實際專案為準，不用誇大的形容包裝。' },
  { title: '取得授權才公開畫面', description: '客戶網站截圖與品牌素材，確認可以公開後才會放上。' },
  { title: '成效數字要有來源', description: '流量、詢問數等數據需要實際統計與客戶同意，整理完成前一律標示整理中。' },
];
