import { BRAND } from '@syt/shared';
import { mediaAssets } from './media';
import type { ChipItem, IconFeature, IconName, LinkItem, RailCard, TimelineStep } from './types';

/** 首頁（Phase 2.6B 依 mockup-home-page 區塊順序） */
export const homeHero = {
  eyebrow: '自助建站・電商整合・內容行銷・成長工具',
  title: BRAND.tagline,
  highlight: '能用的產品',
  lead: '不需要寫程式：選方案、套版型、填內容，就能建立品牌官網與一頁式網頁。電商與特殊流程，先討論再客製。',
  primary: { label: '查看方案', href: '/checkout' } satisfies LinkItem,
  secondary: { label: '看作品', href: '/cases' } satisfies LinkItem,
  line: { label: 'Line@ 客製詢問', href: 'line' } satisfies LinkItem,
  /** 設計稿的 10,000+ / 99.9% / 5 分鐘 / 24/7 未經證實，改為可以說明的產品事實 */
  trust: [
    { value: '可自助・可客製', label: '品牌用戶' },
    { value: '6 種寬度檢查', label: '穩定運行' },
    { value: '5 步驟上線', label: '快速上線' },
    { value: 'LINE@ 詢問', label: '專業支援' },
  ],
  visualNote: '畫面為產品操作示意，不是真實客戶資料。',
};

export const brandTrust = {
  title: '適合各行各業的品牌類型',
  description: '以下為森映產品適用的品牌類型，不是合作客戶標誌；客戶案例取得授權後才會公開。',
  items: [
    { icon: 'mountain', label: '旅宿觀光' },
    { icon: 'utensils', label: '餐飲選物' },
    { icon: 'medical', label: '診所醫美' },
    { icon: 'graduation', label: '課程教育' },
    { icon: 'calendar', label: '活動主辦' },
    { icon: 'building', label: '企業顧問' },
    { icon: 'store', label: '在地店家' },
    { icon: 'cart', label: '品牌電商' },
  ] satisfies { icon: IconName; label: string }[],
};

export const featuredWorks = {
  title: '精選作品，看見更多可能',
  description: '不同產業、不同需求的網站方向。案例畫面取得授權前，以下以示意畫面呈現。',
  action: { label: '探索更多作品', href: '/cases' },
  cards: [
    {
      title: 'Hungjui 形象官網',
      tag: '形象官網',
      description: '服務介紹與每頁 SEO 設定，上線後自行更新內容。',
      image: mediaAssets.seoWebsiteHero,
      note: '示意畫面',
      href: '/cases',
      linkLabel: '看案例方向',
    },
    {
      title: '品牌電商官網',
      tag: '電商網站',
      description: '商品分類、結帳流程與訂單後台，依流程分階段規劃。',
      image: mediaAssets.ecommerceBackupB,
      note: '示意畫面',
      href: '/cases',
      linkLabel: '看案例方向',
    },
    {
      title: '活動報名一頁式',
      tag: '一頁式網頁',
      description: '活動資訊、流程與報名表單集中在一頁。',
      image: mediaAssets.landingPageHero,
      note: '示範版型',
      href: '/products/landing-page',
      linkLabel: '看一頁式網頁',
    },
    {
      title: '節慶活動 DM',
      tag: '活動宣傳',
      description: '社群圖、活動頁與印刷 DM 共用一套視覺。',
      image: mediaAssets.promoPageExamplesB,
      note: '設計示意',
      href: '/products/promo-page-design',
      linkLabel: '看宣傳頁設計',
    },
    {
      title: 'SEO 文章生產器',
      tag: '內容工具',
      description: '關鍵字到文章草稿、FAQ 與 HTML 匯出，人工審稿後發布。',
      image: mediaAssets.seoArticleGeneratorHero,
      note: '內部工具',
      href: '/products/seo-article-generator',
      linkLabel: '看文章生產器',
    },
  ] satisfies RailCard[],
};

export const productEntries = {
  title: '5 大產品，對應不同的網站需求',
  description: '從建站、宣傳到內容經營，依目的選擇產品。',
  action: { label: '探索所有產品', href: '/products' },
  items: [
    { icon: 'layout', title: 'SEO 形象官網', description: '建立品牌形象，每頁都能設定 SEO', href: '/products/seo-website' },
    { icon: 'file', title: '一頁式網頁', description: '活動、課程、預約，一頁說清楚', href: '/products/landing-page' },
    { icon: 'cart', title: '電商網站', description: '商品與結帳流程，先討論再客製', href: '/products/ecommerce-website' },
    { icon: 'megaphone', title: '活動 DM / 宣傳頁', description: '節慶活動、新品發表的宣傳視覺', href: '/products/promo-page-design' },
    { icon: 'pen', title: 'SEO 文章工具', description: '關鍵字到文章草稿，人工審稿後發布', href: '/products/seo-article-generator' },
  ] satisfies IconFeature[],
};

export const buildSteps = {
  title: '5 步驟，建立你的網站',
  description: '不用寫程式，也能擁有結構完整的網站；每一步都找得到人問。',
  steps: [
    { icon: 'tag', title: '選擇方案', description: '依需求選擇產品方案' },
    { icon: 'user', title: '註冊帳號', description: '建立帳號，兌換權限代碼' },
    { icon: 'layout', title: '選擇版型', description: '從版型中挑選適合的風格' },
    { icon: 'pen', title: '填寫內容', description: '依欄位填入文字與圖片' },
    { icon: 'rocket', title: '預約上線', description: '預覽確認後，預約發布上線' },
  ] satisfies TimelineStep[],
};

export const popularTemplates = {
  title: '熱門版型，快速建立專業網站',
  description: '版型商店開放前，以下為版型方向示意；開放後可以直接套用。',
  action: { label: '查看更多版型', href: '/products' },
  chips: [
    { key: 'all', label: '全部' },
    { key: 'corporate', label: '企業形象' },
    { key: 'commerce', label: '電商購物' },
    { key: 'food', label: '餐飲美食' },
    { key: 'travel', label: '旅遊住宿' },
    { key: 'event', label: '活動展示' },
    { key: 'personal', label: '個人品牌' },
  ] satisfies ChipItem[],
  cards: [
    {
      title: '響應式版型展示',
      tag: '全部裝置',
      description: '同一套版型在桌機與手機上的呈現。',
      image: mediaAssets.templateShowcase,
      imageClass: 'object-[50%_60%]',
      note: '版型方向示意',
      filterTags: ['corporate', 'commerce', 'food', 'travel', 'event', 'personal'],
    },
    { title: '極簡企業版', tag: '免費', description: '乾淨專業，適合服務型公司。', visual: 'website', note: '版型方向示意', filterTags: ['corporate'] },
    { title: '時尚電商版', tag: '方案限定', description: '商品分類與規格清楚呈現。', visual: 'ecommerce', note: '版型方向示意', filterTags: ['commerce'] },
    {
      title: '餐飲美食版',
      tag: '付費',
      description: '菜單、訂位入口與店家資訊。',
      poster: { headline: '今日菜單', sub: '餐飲美食版型', theme: 'amber' },
      filterTags: ['food'],
    },
    {
      title: '旅遊民宿版',
      tag: '付費',
      description: '房型介紹、交通資訊與預約入口。',
      poster: { headline: '山海之間', sub: '旅遊住宿版型', theme: 'teal' },
      filterTags: ['travel'],
    },
    { title: '活動宣傳版', tag: '免費', description: '活動資訊、議程與報名表單。', visual: 'landing', note: '版型方向示意', filterTags: ['event'] },
    {
      title: '個人品牌版',
      tag: '免費',
      description: '作品集、服務項目與聯絡方式。',
      poster: { headline: '個人品牌', sub: '作品集版型', theme: 'slate' },
      filterTags: ['personal'],
    },
  ] satisfies RailCard[],
};

export const homeFinalCta = {
  title: '現在就開始，打造屬於你的數位產品',
  description: '選擇適合的方案，體驗森映自助建站平台，讓你的想法被更多人看見。',
  primary: { label: '立即開始', href: '/checkout' },
  secondary: { label: 'Line@ 客製詢問', href: 'line' },
  script: '從想法到無限可能',
};
