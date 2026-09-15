/**
 * 前台正式圖片（Phase 2.6）。
 * - 唯一來源：docs/design/IMAGE_SELECTION_PLAN.csv 的 WebPath，檔案位於 apps/marketing/public/images
 * - 只使用 -final 檔名（小寫英數、無空格、無中文），不引用 docs/design 或本機下載資料夾
 * - width / height 為圖片實際解析度（讀取 PNG header），避免 layout shift
 * - PNG 是原始檔與 img 標籤 fallback；Phase 2.7 由 pnpm images:optimize 產生 WebP / AVIF 多尺寸版本（image-variants.generated.json），
 *   ResponsiveImage 自動輸出 <picture>，現代瀏覽器不會下載 PNG
 * - 圖片只做視覺輔助：H1、內文、CTA、FAQ 與 JSON-LD 一律以文字呈現
 */
export type MarketingImageRole = 'hero' | 'card' | 'background';

export type MarketingImageAsset = {
  label: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  purpose: string;
  /** 預算類別（Phase 2.7）：hero 首屏主視覺、card 卡片 / 內容圖、background 背景 */
  role: MarketingImageRole;
};

export const mediaAssets = {
  homeHero: {
    label: 'home_hero',
    src: '/images/hero/home-hero-platform-ui-final.png',
    alt: '森映自助建站平台主視覺：夜晚山景前漂浮的網站、平板與成長圖表介面示意',
    width: 1672,
    height: 941,
    purpose: '首頁 Hero 主視覺',
    role: 'hero',
  },
  backgroundDark: {
    label: 'background_dark',
    src: '/images/backgrounds/mountain-dark-bg-final.png',
    alt: '深藍夜色中的山脈、森林與雲霧背景',
    width: 1672,
    height: 941,
    purpose: '深色 CTA / Hero 背景',
    role: 'background',
  },
  backgroundBright: {
    label: 'background_bright',
    src: '/images/backgrounds/mountain-bright-bg-final.png',
    alt: '清晨陽光照在山脈與雲海上的森映品牌延伸視覺',
    width: 1672,
    height: 941,
    purpose: '亮色品牌延伸背景',
    role: 'background',
  },
  seoWebsiteHero: {
    label: 'seo_website_hero',
    src: '/images/products/seo-website/seo-website-hero-final.png',
    alt: 'SEO 形象官網示意：筆電與手機同時顯示品牌官網首頁版面',
    width: 1672,
    height: 941,
    purpose: 'SEO 形象官網產品頁 Hero',
    role: 'hero',
  },
  landingPageHero: {
    label: 'landing_page_hero',
    src: '/images/products/landing-page/landing-page-hero-final.png',
    alt: '一頁式網頁示意：筆電與手機顯示以山景為主視覺的單頁版面',
    width: 1672,
    height: 941,
    purpose: '一頁式網頁產品頁 Hero',
    role: 'hero',
  },
  ecommerceHero: {
    label: 'ecommerce_hero',
    src: '/images/products/ecommerce-website/ecommerce-website-hero-final.png',
    alt: '電商網站示意：筆電與手機顯示商品頁，旁邊是購物車、收藏、標籤與付款圖示',
    width: 1672,
    height: 941,
    purpose: '電商網站產品頁 Hero',
    role: 'hero',
  },
  promoPageHero: {
    label: 'promo_page_hero',
    src: '/images/products/promo-page-design/promo-page-design-hero-final.png',
    alt: '活動 DM 與宣傳頁示意：節慶禮盒、海島旅遊與咖啡三種主題的宣傳海報',
    width: 1672,
    height: 941,
    purpose: '活動 DM / 宣傳頁產品頁 Hero',
    role: 'hero',
  },
  promoPageExamplesA: {
    label: 'promo_page_examples_a',
    src: '/images/products/promo-page-design/promo-page-examples-a-final.png',
    alt: '活動 DM 範例示意：情人節禮盒、海島旅遊與咖啡主題的直式宣傳圖',
    width: 1448,
    height: 1086,
    purpose: '活動 DM 範例圖 A',
    role: 'card',
  },
  promoPageExamplesB: {
    label: 'promo_page_examples_b',
    src: '/images/products/promo-page-design/promo-page-examples-b-final.png',
    alt: '活動宣傳海報示意：三張不同主題的直式宣傳圖並排展示',
    width: 1672,
    height: 941,
    purpose: '活動 DM 範例圖 B',
    role: 'card',
  },
  seoArticleGeneratorHero: {
    label: 'seo_article_generator_hero',
    src: '/images/products/seo-article-generator/seo-article-generator-hero-final.png',
    alt: 'SEO 文章生產器示意：筆電顯示文章編輯畫面，旁邊有 SEO 分數、檢查清單與流量圖表',
    width: 1672,
    height: 941,
    purpose: 'SEO 文章生產器產品頁 Hero',
    role: 'hero',
  },
  templateShowcase: {
    label: 'template_showcase',
    src: '/images/templates/template-showcase-devices-final.png',
    alt: '版型響應式展示：桌上型螢幕與兩支手機顯示同一套網站版型',
    width: 1672,
    height: 941,
    purpose: '版型展示 / RWD 展示',
    role: 'hero',
  },
  adminDashboardSeoScore: {
    label: 'admin_dashboard_seo_score',
    src: '/images/ui-mockups/admin-dashboard-seo-score-final.png',
    alt: '後台工具示意：筆電顯示後台側欄與內容管理畫面，搭配平板、手機與數據圖表',
    width: 1672,
    height: 941,
    purpose: '後台 / SEO 工具展示',
    role: 'hero',
  },
  blogVisual: {
    label: 'blog_visual',
    src: '/images/blog/blog-visual-final.png',
    alt: '文章頁面視覺：窗邊書桌上的筆電、咖啡與筆記本，窗外是山景',
    width: 1448,
    height: 1086,
    purpose: 'Blog 頁面視覺',
    role: 'card',
  },
  caseVisual: {
    label: 'case_visual',
    src: '/images/cases/case-visual-final.png',
    alt: '案例頁面視覺示意：住宿、選物、活動、企業後台、診所與教育等產業情境拼貼，不是實際客戶畫面',
    width: 1448,
    height: 1086,
    purpose: '案例頁面視覺',
    role: 'hero',
  },
  ecommerceBackupA: {
    label: 'ecommerce_backup_a',
    src: '/images/products/ecommerce-website/ecommerce-backup-a-final.png',
    alt: '電商版型示意：筆電與手機顯示保養品商品列表與購物車入口',
    width: 1448,
    height: 1086,
    purpose: '電商網站備用視覺 A',
    role: 'card',
  },
  ecommerceBackupB: {
    label: 'ecommerce_backup_b',
    src: '/images/products/ecommerce-website/ecommerce-backup-b-final.png',
    alt: '電商網站示意：筆電與手機顯示商品頁與購物相關圖示',
    width: 1672,
    height: 941,
    purpose: '電商網站備用視覺 B',
    role: 'card',
  },
} satisfies Record<string, MarketingImageAsset>;

/** 產品頁 Hero 圖（依產品 slug） */
export const productHeroImages: Record<string, MarketingImageAsset> = {
  'seo-website': mediaAssets.seoWebsiteHero,
  'landing-page': mediaAssets.landingPageHero,
  'ecommerce-website': mediaAssets.ecommerceHero,
  'promo-page-design': mediaAssets.promoPageHero,
  'seo-article-generator': mediaAssets.seoArticleGeneratorHero,
};
