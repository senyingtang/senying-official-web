import type { BlogCategoryOption, BlogPostDetail, CaseStudyDetail } from '../cms-content';
import { EMPTY_CONTENT_SEO } from '../cms-content';
import type { CmsNavigationItemView } from '../repositories';

/**
 * Mock CMS 內容（DATA_SOURCE=mock）。
 *
 * - 案例：官網既有的 8 筆案例 / 版型示意原文搬進 CMS 模型，文字未改寫，也沒有加入任何未經確認的成效數字
 * - 文章：3 篇「示範文章」（摘要與內文開頭都標示示範），加上 draft / scheduled / archived 各一筆，
 *         用來驗證未發布內容不會進入前台 build
 * - 寫入只改記憶體（persisted = false），重新啟動即還原
 */

const ISO = (value: string): string => new Date(value).toISOString();

export const MOCK_BLOG_CATEGORIES: BlogCategoryOption[] = [
  { id: 'cat-seo', slug: 'seo', name: 'SEO 優化' },
  { id: 'cat-web-design', slug: 'web-design', name: '網站設計' },
  { id: 'cat-content-marketing', slug: 'content-marketing', name: '內容行銷' },
  { id: 'cat-tools', slug: 'tools', name: '數位工具' },
  { id: 'cat-brand', slug: 'brand', name: '品牌經營' },
  { id: 'cat-case-sharing', slug: 'case-sharing', name: '案例分享' },
  { id: 'cat-insights', slug: 'insights', name: '產業觀點' },
];

const DEMO_NOTE = '> 這是示範文章，用來展示文章版面與後台編輯流程。\n\n';

function blogPost(post: Partial<BlogPostDetail> & Pick<BlogPostDetail, 'id' | 'slug' | 'title'>): BlogPostDetail {
  return {
    excerpt: '',
    content: '',
    readingMinutes: 3,
    status: 'draft',
    categorySlug: '',
    categoryName: '未分類',
    coverImageUrl: '',
    authorName: '森映編輯台',
    isFeatured: false,
    publishedAt: null,
    scheduledAt: null,
    createdAt: ISO('2025-08-01T02:00:00Z'),
    updatedAt: ISO('2025-08-01T02:00:00Z'),
    seo: { ...EMPTY_CONTENT_SEO },
    ...post,
  };
}

export const MOCK_BLOG_POSTS: BlogPostDetail[] = [
  blogPost({
    id: 'demo-blog-seo-first-3-months',
    slug: 'new-site-seo-first-3-months',
    title: '新網站怎麼開始做 SEO？前 3 個月的內容安排',
    excerpt: '示範文章：從頁面架構、網址規則到第一批文章主題，整理新網站前 3 個月可以先完成的事。',
    categorySlug: 'seo',
    categoryName: 'SEO 優化',
    authorName: '森映編輯台',
    status: 'published',
    isFeatured: true,
    publishedAt: ISO('2025-08-12T02:00:00Z'),
    updatedAt: ISO('2025-08-12T02:00:00Z'),
    content: `${DEMO_NOTE}## 先確認頁面架構與網址

新網站上線前先決定頁面清單與網址規則，之後改網址要處理轉址，成本比一開始想清楚高。

- 首頁、服務頁、案例頁、文章列表、聯絡頁先各自對應一組網址
- 網址使用小寫英文與連字號，例如 \`/products/seo-website\`
- 同一個主題只保留一個頁面，避免自己的頁面互相競爭

## 第一批文章主題怎麼選

先寫客人詢問時最常問的問題，這些問題本來就有人在搜尋，也最容易寫得具體。

1. 服務流程與時程
2. 價格怎麼估、包含哪些項目
3. 上線後要自己維護哪些內容

## 內部連結怎麼安排

文章寫完後，從文章連回對應的服務頁，服務頁也列出相關文章。連結文字直接寫頁面主題，不要用「點這裡」。

> 前 3 個月的重點是把架構與主題整理好，而不是一次寫很多篇。`,
    seo: {
      seoTitle: '新網站 SEO 怎麼開始？前 3 個月的內容安排',
      seoDescription: '新網站前 3 個月的 SEO 安排：頁面架構與網址規則、第一批文章主題怎麼選、內部連結怎麼配置。示範文章。',
      ogImageUrl: '',
      canonicalOverride: '',
    },
  }),
  blogPost({
    id: 'demo-blog-brand-site-structure',
    slug: 'brand-site-structure',
    title: '品牌官網怎麼規劃？首頁、服務頁到案例頁的架構',
    excerpt: '示範文章：先想清楚訪客要找什麼，再決定頁面順序與每一頁要回答的問題。',
    categorySlug: 'web-design',
    categoryName: '網站設計',
    status: 'published',
    publishedAt: ISO('2025-08-20T02:00:00Z'),
    updatedAt: ISO('2025-08-20T02:00:00Z'),
    content: `${DEMO_NOTE}## 首頁要先講哪件事

首頁第一屏回答三件事：你是誰、你提供什麼、下一步要做什麼。其他內容往下排。

## 服務頁怎麼分

一個服務一頁，內容包含服務範圍、流程、時程與常見問題。不要把所有服務塞在同一頁，訪客與搜尋引擎都不容易判斷這頁在講什麼。

## 案例頁放什麼

- 產業與需求：這個客戶原本遇到什麼問題
- 做法：用了哪些頁面與功能
- 使用產品：對應到你的哪一個方案

成效數字要有實際統計與客戶同意才公開，還沒確認前就先留白。`,
  }),
  blogPost({
    id: 'demo-blog-custom-domain-dns',
    slug: 'custom-domain-dns',
    title: '自訂網域怎麼設定？CNAME、TXT 驗證與 www 網址',
    excerpt: '示範文章：把網域指到網站前，先分清楚根網域與 www 網址的差別。',
    categorySlug: 'tools',
    categoryName: '數位工具',
    status: 'published',
    publishedAt: ISO('2025-08-28T02:00:00Z'),
    updatedAt: ISO('2025-08-28T02:00:00Z'),
    content: `${DEMO_NOTE}## CNAME 與 TXT 紀錄

- **CNAME**：把 \`www\` 指到平台提供的網址
- **TXT**：證明網域是你的，驗證通過後才會簽發憑證

## 為什麼建議先用 www

根網域（例如 \`example.com\`）不能設定 CNAME，需要改用平台支援的其他方式。先用 \`www\` 上線，再把根網域轉址過去，流程比較單純。

## 設定後多久生效

DNS 更新需要時間，通常幾分鐘到數小時。生效前網站可能時好時壞，屬於正常現象。`,
  }),
  blogPost({
    id: 'demo-blog-draft-launch-checklist',
    slug: 'launch-checklist',
    title: '網站上線前的檢查清單：手機版、表單與 SEO 設定',
    excerpt: '示範用草稿：草稿不會出現在官網，也不會進入搜尋索引。',
    categorySlug: 'web-design',
    categoryName: '網站設計',
    status: 'draft',
    content: `${DEMO_NOTE}## 草稿內容

這篇是草稿狀態的示範資料，用來確認未發布內容不會被建置到官網。`,
  }),
  blogPost({
    id: 'demo-blog-scheduled-faq-schema',
    slug: 'faq-schema-guide',
    title: 'FAQ 結構化資料怎麼寫？哪些問題適合放進 FAQ',
    excerpt: '示範用排程文章：排程時間未到之前，不會出現在官網。',
    categorySlug: 'seo',
    categoryName: 'SEO 優化',
    status: 'scheduled',
    scheduledAt: ISO('2099-01-01T00:00:00Z'),
    publishedAt: ISO('2099-01-01T00:00:00Z'),
    content: `${DEMO_NOTE}## 排程內容

這篇是排程狀態的示範資料，排程時間為 2099 年，不應該出現在前台。`,
  }),
  blogPost({
    id: 'demo-blog-archived-redeem-code',
    slug: 'redeem-access-code',
    title: '權限代碼怎麼兌換：從收到代碼到建立第一個網站',
    excerpt: '示範用已下架文章：下架後官網不再輸出這一頁。',
    categorySlug: 'tools',
    categoryName: '數位工具',
    status: 'archived',
    publishedAt: ISO('2025-07-01T02:00:00Z'),
    updatedAt: ISO('2025-09-01T02:00:00Z'),
    content: `${DEMO_NOTE}## 已下架內容

這篇是已下架狀態的示範資料，不應該出現在前台。`,
  }),
];

function caseStudy(item: Partial<CaseStudyDetail> & Pick<CaseStudyDetail, 'id' | 'slug' | 'title'>): CaseStudyDetail {
  return {
    excerpt: '',
    content: '',
    industry: '',
    serviceType: '',
    coverImageUrl: '',
    clientLabel: '',
    isSample: false,
    displayStatus: '案例整理中',
    status: 'published',
    isFeatured: false,
    sortOrder: 0,
    challenge: '',
    solution: '',
    resultSummary: '',
    gallery: [],
    publishedAt: ISO('2025-08-01T02:00:00Z'),
    createdAt: ISO('2025-08-01T02:00:00Z'),
    updatedAt: ISO('2025-08-01T02:00:00Z'),
    seo: { ...EMPTY_CONTENT_SEO },
    ...item,
  };
}

const caseBody = (challenge: string, solution: string, products: string[]): string =>
  `## 需求背景\n\n${challenge}\n\n## 做法\n\n${solution}\n\n## 使用產品\n\n${products.map((item) => `- ${item}`).join('\n')}`;

/** 官網既有案例（文字沿用 apps/marketing/src/content/cases.ts，未新增任何成效數字） */
export const MOCK_CASE_STUDIES: CaseStudyDetail[] = [
  caseStudy({
    id: 'demo-case-hungjui-brand-site',
    clientLabel: 'Hungjui',
    isSample: false,
    displayStatus: '案例整理中',
    slug: 'hungjui-brand-site',
    title: 'Hungjui 形象官網',
    industry: '品牌形象官網',
    serviceType: 'SEO 形象官網',
    excerpt: '需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。',
    challenge: '需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。',
    solution: '以 SEO 形象官網架構整理首頁、服務、關於與聯絡頁，每頁設定獨立的 SEO 欄位與 FAQ。',
    content: caseBody(
      '需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。',
      '以 SEO 形象官網架構整理首頁、服務、關於與聯絡頁，每頁設定獨立的 SEO 欄位與 FAQ。',
      ['SEO 形象官網'],
    ),
    isFeatured: true,
    sortOrder: 10,
  }),
  caseStudy({
    id: 'demo-case-brand-ecommerce',
    clientLabel: '電商品牌客戶',
    isSample: false,
    displayStatus: '案例整理中',
    slug: 'brand-ecommerce-site',
    title: '品牌電商官網',
    industry: '品牌電商',
    serviceType: '電商網站',
    excerpt: '商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。',
    challenge: '商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。',
    solution: '規劃商品分類、結帳流程與訂單後台，並預留綠界與 LINE Pay 的串接方式。',
    content: caseBody(
      '商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。',
      '規劃商品分類、結帳流程與訂單後台，並預留綠界與 LINE Pay 的串接方式。',
      ['電商網站'],
    ),
    isFeatured: true,
    sortOrder: 20,
  }),
  caseStudy({
    id: 'demo-case-seo-article-generator',
    clientLabel: '森映內部工具',
    isSample: false,
    displayStatus: '內部使用中',
    slug: 'seo-article-generator',
    title: 'SEO 文章生產器',
    industry: '內容經營',
    serviceType: 'SEO 文章生產器',
    excerpt: '文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。',
    challenge: '文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。',
    solution: '把品牌資料、關鍵字與語氣設定整理成流程，產出含 FAQ Schema 的文章草稿，再由人工審稿。',
    content: caseBody(
      '文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。',
      '把品牌資料、關鍵字與語氣設定整理成流程，產出含 FAQ Schema 的文章草稿，再由人工審稿。',
      ['SEO 文章生產器'],
    ),
    isFeatured: true,
    sortOrder: 30,
  }),
  caseStudy({
    id: 'demo-case-booking-event-pages',
    clientLabel: '示範版型',
    isSample: true,
    displayStatus: '示範案例',
    slug: 'booking-event-pages',
    title: '預約 / 活動頁',
    industry: '美業預約 · 活動報名',
    serviceType: '一頁式網頁',
    excerpt: '預約和報名都靠私訊，時段與人數要一筆一筆整理。',
    challenge: '預約和報名都靠私訊，時段與人數要一筆一筆整理。',
    solution: '以一頁式網頁版型示範預約表單與活動報名流程，資料集中在後台表單紀錄。',
    content: caseBody(
      '預約和報名都靠私訊，時段與人數要一筆一筆整理。',
      '以一頁式網頁版型示範預約表單與活動報名流程，資料集中在後台表單紀錄。',
      ['一頁式網頁', '預約表單頁'],
    ),
    isFeatured: true,
    sortOrder: 40,
  }),
  caseStudy({
    id: 'demo-case-sample-lodging-site',
    clientLabel: '版型示意',
    isSample: true,
    displayStatus: '版型示意',
    slug: 'sample-lodging-site',
    title: '山景旅宿官網版型',
    industry: '旅宿觀光',
    serviceType: 'SEO 形象官網',
    excerpt: '房型、交通與預約資訊分散在社群，旅客很難一次看懂。',
    challenge: '房型、交通與預約資訊分散在社群，旅客很難一次看懂。',
    solution: '以形象官網版型整理房型介紹、周邊景點與預約入口。',
    content: caseBody('房型、交通與預約資訊分散在社群，旅客很難一次看懂。', '以形象官網版型整理房型介紹、周邊景點與預約入口。', ['SEO 形象官網']),
    sortOrder: 50,
  }),
  caseStudy({
    id: 'demo-case-sample-festival-dm',
    clientLabel: '設計示意',
    isSample: true,
    displayStatus: '設計示意',
    slug: 'sample-festival-dm',
    title: '節慶活動 DM 視覺',
    industry: '百貨零售',
    serviceType: '活動 DM / 宣傳頁',
    excerpt: '同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。',
    challenge: '同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。',
    solution: '先整理活動資訊，再延伸社群、網頁與印刷尺寸。',
    content: caseBody('同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。', '先整理活動資訊，再延伸社群、網頁與印刷尺寸。', ['活動 DM / 宣傳頁']),
    sortOrder: 60,
  }),
  caseStudy({
    id: 'demo-case-sample-course-landing',
    clientLabel: '版型示意',
    isSample: true,
    displayStatus: '版型示意',
    slug: 'sample-course-landing',
    title: '課程招生一頁式版型',
    industry: '教育培訓',
    serviceType: '一頁式網頁',
    excerpt: '課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。',
    challenge: '課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。',
    solution: '以課程招生頁型安排大綱、講師、FAQ 與報名表單。',
    content: caseBody('課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。', '以課程招生頁型安排大綱、講師、FAQ 與報名表單。', ['課程招生頁']),
    sortOrder: 70,
  }),
  caseStudy({
    id: 'demo-case-sample-select-shop',
    clientLabel: '版型示意',
    isSample: true,
    displayStatus: '版型示意',
    slug: 'sample-select-shop',
    title: '生活選物電商版型',
    industry: '生活居家',
    serviceType: '電商網站',
    excerpt: '商品規格多，希望分類清楚、手機也好瀏覽。',
    challenge: '商品規格多，希望分類清楚、手機也好瀏覽。',
    solution: '以電商版型規劃商品分類、規格說明與購物車入口。',
    content: caseBody('商品規格多，希望分類清楚、手機也好瀏覽。', '以電商版型規劃商品分類、規格說明與購物車入口。', ['電商網站']),
    sortOrder: 80,
  }),
  caseStudy({
    id: 'demo-case-draft-clinic-site',
    clientLabel: '版型示意',
    isSample: true,
    displayStatus: '版型示意',
    slug: 'sample-clinic-site',
    title: '診所形象官網版型',
    industry: '醫療健康',
    serviceType: 'SEO 形象官網',
    excerpt: '示範用草稿案例：草稿不會出現在官網。',
    challenge: '門診時間、醫師介紹與衛教內容分散，患者不容易找到。',
    solution: '以形象官網版型整理門診資訊、醫師介紹與衛教文章入口。',
    content: caseBody('門診時間、醫師介紹與衛教內容分散，患者不容易找到。', '以形象官網版型整理門診資訊、醫師介紹與衛教文章入口。', ['SEO 形象官網']),
    status: 'draft',
    publishedAt: null,
    sortOrder: 90,
  }),
];

/** Header / Footer 選單（對應 cms_navigation_menus / cms_navigation_items 的 0017 seed） */
export const MOCK_NAVIGATION_ITEMS: CmsNavigationItemView[] = [
  { id: 'nav-header-products', menuKey: 'header', menuName: '主選單', label: '產品服務', href: '/products', sortOrder: 10, enabled: true, openInNewTab: false },
  { id: 'nav-header-cases', menuKey: 'header', menuName: '主選單', label: '案例作品', href: '/cases', sortOrder: 20, enabled: true, openInNewTab: false },
  { id: 'nav-header-blog', menuKey: 'header', menuName: '主選單', label: '部落格', href: '/blog', sortOrder: 30, enabled: true, openInNewTab: false },
  { id: 'nav-header-checkout', menuKey: 'header', menuName: '主選單', label: '價格方案', href: '/checkout', sortOrder: 40, enabled: true, openInNewTab: false },
  { id: 'nav-header-about', menuKey: 'header', menuName: '主選單', label: '關於我們', href: '/about', sortOrder: 50, enabled: true, openInNewTab: false },
  { id: 'nav-footer-terms', menuKey: 'footer', menuName: '頁尾選單', label: '服務條款', href: '/legal/terms', sortOrder: 10, enabled: true, openInNewTab: false },
  { id: 'nav-footer-privacy', menuKey: 'footer', menuName: '頁尾選單', label: '隱私權政策', href: '/legal/privacy', sortOrder: 20, enabled: true, openInNewTab: false },
];
