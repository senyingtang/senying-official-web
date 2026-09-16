/**
 * Phase 2.6B 設計稿版型對照表（驗收用 verification map，不會顯示在網站上）。
 *
 * - 每頁的 sections 依設計稿右側「區塊說明」的順序與數量列出，key 對應頁面輸出的 data-section。
 * - 設計稿右側說明欄只作為版型規格參考，說明文字不放進正式官網。
 * - supplemental：設計稿沒有、但既有驗收要求保留的區塊（例如每頁 FAQ + FAQPage JSON-LD），需寫明原因。
 * - finalCta：該頁 Final CTA 所在的區塊 key（輸出 data-final-cta）。
 *
 * 此檔案不 import 其他模組，驗收腳本（Node type stripping）可直接載入。
 */
export interface MockupSection {
  key: string;
  /** 設計稿區塊名稱 */
  title: string;
  /** 實作重點（含改寫原因） */
  spec: string;
}

export interface SupplementalSection {
  key: string;
  reason: string;
}

export interface MockupPageLayout {
  route: string;
  /** docs/design/uiux-mockups 內的設計稿檔名（只作參考，不可當成網站圖片） */
  mockup: string;
  /** docs/design/designer-handoff 內的對應檔名（與 mockup 內容相同） */
  handoff: string;
  sections: MockupSection[];
  supplemental: SupplementalSection[];
  finalCta: string;
}

const FAQ_SUPPLEMENT: SupplementalSection = {
  key: 'faq',
  reason: 'Phase 2.5 SEO 驗收要求每頁保留 FAQ 區塊與 FAQPage JSON-LD；以雙欄緊湊版放在 Final CTA 前。',
};

const header: MockupSection = { key: 'header', title: 'Header 導覽列', spec: '深色玻璃感；搜尋 / 登入 / 立即開始；手機漢堡選單' };
const footer: MockupSection = { key: 'footer', title: 'Footer', spec: '深色；產品服務 / 資源 / 關於我們 / 社群 placeholder / 法律連結' };

export const MOCKUP_LAYOUTS: MockupPageLayout[] = [
  {
    route: '/',
    mockup: 'mockup-home-page.png',
    handoff: 'home-page-design-reference.png',
    sections: [
      header,
      { key: 'hero', title: 'Hero 首屏區', spec: '深藍科技底；左大標、查看方案 / 看作品 / Line@ 客製詢問；右產品畫面；下方信任資訊（不寫未證實數字）' },
      { key: 'brand-trust', title: '品牌信任區', spec: '淺色橫排；以「品牌類型」placeholder 取代真實客戶 logo' },
      { key: 'featured-works', title: '作品展示區', spec: '深色；橫向作品卡（圖 + 產業標籤 + 標題 + 說明），hover 只加微光' },
      { key: 'products', title: '產品入口區', spec: '5 大產品卡：icon + 說明 + 了解更多' },
      { key: 'process', title: '建站流程區', spec: '5 步驟；桌機橫向、手機直向時間軸' },
      { key: 'templates', title: '熱門版型區', spec: '深色山景底；分類 chips + 版型卡 + 查看更多版型' },
      { key: 'cta', title: 'Final CTA', spec: '立即開始 / Line@ 客製詢問；山景背景圖 + overlay' },
      footer,
    ],
    supplemental: [FAQ_SUPPLEMENT],
    finalCta: 'cta',
  },
  {
    route: '/products',
    mockup: 'mockup-products-overview-page.png',
    handoff: 'products-overview-design-reference.png',
    sections: [
      header,
      { key: 'hero', title: 'Hero 首屏區', spec: '主標 + 副文；主 CTA 諮詢適合的方案、次 CTA 看案例作品；右側產品畫面' },
      { key: 'categories', title: '分類篩選', spec: '全部產品 / 網站建置 / 電商方案 / 行銷推廣 / SEO 工具 chips' },
      { key: 'product-cards', title: '產品卡片區', spec: '5 張卡：名稱、主要優勢、適合對象、價格狀態（priceDisplay，不寫 NT$ 金額）、了解詳情' },
      { key: 'comparison', title: '產品功能比較區', spec: '表格：適合對象 / 頁面數量 / 金流 / 會員 / SEO 優化 / 製作時間 / 價格區間；手機改卡片式' },
      { key: 'audience', title: '適合對象情境區', spec: '各產品適合的對象卡片 + 看案例作品連結' },
      { key: 'quick-start', title: '入門流程區', spec: '3 步驟快速開始使用' },
      { key: 'cta', title: 'Final CTA', spec: '深色山景；預約討論 / Line@ 線上詢問' },
      footer,
    ],
    supplemental: [FAQ_SUPPLEMENT],
    finalCta: 'cta',
  },
  {
    route: '/products/seo-website',
    mockup: 'mockup-product-seo-website-page.png',
    handoff: 'product-seo-website-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區塊', spec: 'SEO 形象官網 / 不只是網站，更是你的數位業務；查看方案 / 看作品 / Line@ 詢問；右側畫面；成效數字改為產品特色' },
      { key: 'pain-points', title: '痛點區塊', spec: '缺乏品牌信任感 / 搜尋不到你的網站 / 內容不夠清楚' },
      { key: 'solutions', title: '解決方案（功能特色）', spec: '品牌形象區塊 / 服務介紹區塊 / FAQ 常見問題 / 轉換行動區 / SEO 基礎設定 / 響應式設計' },
      { key: 'process', title: '建站流程', spec: '5 步驟時間軸' },
      { key: 'industries', title: '適合產業', spec: '6 大產業卡片' },
      { key: 'showcase', title: '作品案例', spec: '案例 / 版型卡片，標示示意' },
      { key: 'faq', title: '常見問題', spec: '雙欄收合 FAQ' },
      { key: 'cta', title: '最終 CTA', spec: '查看方案 / Line@ 詢問' },
      footer,
    ],
    supplemental: [],
    finalCta: 'cta',
  },
  {
    route: '/products/landing-page',
    mockup: 'mockup-product-landing-page.png',
    handoff: 'product-landing-page-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 首屏', spec: '一頁式網頁 / 把你的想法，變成會帶來行動的頁面；CTA + 產品畫面 + 信任標籤' },
      { key: 'scenarios', title: '應用情境', spec: '商品團購 / 活動報名 / 課程招生 / 預約諮詢 / 商品發表 / 專案計畫' },
      { key: 'pain-points', title: '痛點', spec: '深色帶：時間、成本、技術、轉換四個痛點' },
      { key: 'modules', title: '模組解法', spec: 'Hero / 賣點 / 議程 / 表單 / FAQ / CTA 區塊' },
      { key: 'benefits', title: '功能重點', spec: '快速上線 / 免寫程式 / 表單紀錄 / 技術支援' },
      { key: 'examples', title: '範例展示', spec: '深色橫向範例卡；移除設計稿的成效數字，標示示意' },
      { key: 'process', title: '購買到上線流程', spec: '選擇方案 / 套用版型 / 編輯內容 / 預覽確認 / 發佈上線' },
      { key: 'faq', title: 'FAQ', spec: '雙欄收合' },
      { key: 'cta', title: 'CTA', spec: '立即建立一頁式網頁 / 聯絡我們' },
      footer,
    ],
    supplemental: [],
    finalCta: 'cta',
  },
  {
    route: '/products/ecommerce-website',
    mockup: 'mockup-product-ecommerce-website-page.png',
    handoff: 'product-ecommerce-website-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 首屏區', spec: '電商網站 / 打造會賣的品牌電商平台；客製詢問 / 查看方案 / Line@；說明第一版以展示與客製討論為主' },
      { key: 'pain-points', title: '痛點區', spec: '商品管理複雜 / 金流串接困難 / 物流配送整合 / 品牌形象不夠突出' },
      { key: 'solutions', title: '解決方案區', spec: '專屬設計 / 完整功能 / 彈性擴充 / 專業支援' },
      { key: 'features', title: '功能模組區', spec: '商品管理 / 金流整合 / 物流串接 / 訂單管理 / 優惠活動 / SEO 基礎' },
      { key: 'process', title: '建置流程區', spec: '5 步驟時間軸' },
      { key: 'industries', title: '適合產業區', spec: '6 類店家類型' },
      { key: 'showcase', title: '案例 / 版型區', spec: '分類 chips + 水平輪播，標示版型示意' },
      { key: 'faq', title: '常見問題區', spec: '雙欄收合' },
      { key: 'cta', title: '最終 CTA', spec: 'Line@ 客製詢問（主）+ 查看方案' },
      footer,
    ],
    supplemental: [],
    finalCta: 'cta',
  },
  {
    route: '/products/promo-page-design',
    mockup: 'mockup-product-promo-page-design-page.png',
    handoff: 'product-promo-page-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區域', spec: '活動 DM / 宣傳頁設計 / 用視覺放大你的行銷力；立即諮詢設計 / 查看作品；特色條（移除 99.9% 滿意度）' },
      { key: 'featured-cases', title: '案例輪播', spec: '百貨零售 / 美妝保養 / 旅遊觀光 / 餐飲美食 / 教育課程，標示設計示意' },
      { key: 'scenarios', title: '應用情境', spec: '節慶活動 / 檔期促銷 / 新品上架 / 品牌宣傳' },
      { key: 'visual-benefits', title: '視覺溝通效益', spec: '深色帶：關注度、品牌印象、行動入口、核心訊息（不宣稱成效）' },
      { key: 'services', title: '服務亮點', spec: '主視覺設計 / 文案排版 / 多版本輸出 / 印刷協助 / 上線後調整' },
      { key: 'process', title: '製作流程', spec: '5 步驟時間軸' },
      { key: 'style-examples', title: '視覺範例', spec: '5 種設計風格卡' },
      { key: 'faq', title: '常見問題', spec: '雙欄收合' },
      { key: 'cta', title: '最終 CTA', spec: '立即諮詢設計 / Line@ 詢問' },
      footer,
    ],
    supplemental: [],
    finalCta: 'cta',
  },
  {
    route: '/products/seo-article-generator',
    mockup: 'mockup-product-seo-article-generator-page.png',
    handoff: 'product-seo-article-generator-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區域', spec: 'SEO 文章生產器 / 用 AI 高效產出符合搜尋意圖的優質文章；移除 10,000+ / 300% 等數字；標示內部工具' },
      { key: 'pain-points', title: '痛點區域', spec: '4 個內容創作痛點' },
      { key: 'solutions', title: '解決方案', spec: '深色品牌帶：流程說明與人工審稿' },
      { key: 'features', title: '功能卡片', spec: '關鍵字輸入 / 文章草稿 / HTML 輸出 / FAQ Schema / 額度管理 / 權限代碼' },
      { key: 'tool-ui', title: '工具介面展示', spec: 'HTML 介面示意（輸入 → 生成 → 預覽）+ 後台畫面圖' },
      { key: 'workflow', title: '工作流程', spec: '5 步驟時間軸' },
      { key: 'plans', title: '額度 / 方案', spec: '入門 / 專業 / 企業；價格顯示方案整理中，不寫金額' },
      { key: 'faq', title: 'FAQ', spec: '雙欄收合；含人工審稿與不保證排名說明' },
      { key: 'cta', title: '最終 CTA', spec: '預約討論 / Line@ 登記通知' },
      footer,
    ],
    supplemental: [],
    finalCta: 'cta',
  },
  {
    route: '/cases',
    mockup: 'mockup-cases-page.png',
    handoff: 'cases-page-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區域', spec: '案例作品 / 用數位創意，成就更多可能；移除 10,000+ / 300+ / 98% 數據' },
      { key: 'filters', title: '分類篩選', spec: '案例分類 chips' },
      { key: 'search-sort', title: '搜尋與排序', spec: '關鍵字搜尋 + 排序選單（漸進增強）' },
      { key: 'case-list', title: '案例列表', spec: '預覽畫面 + 產業標籤 + 名稱 + 需求 + 使用產品；示意卡片標示版型示意' },
      { key: 'results', title: '精選案例成果', spec: '沿用數據卡版面，數值改為整理中並標示「示意版面，正式案例數據待確認」' },
      { key: 'industries', title: '服務產業領域', spec: 'icon 產業方塊' },
      { key: 'pagination', title: '分頁 / 載入更多', spec: '分頁導覽；目前案例已全部顯示' },
      { key: 'cta', title: 'CTA 行動區塊', spec: '立即諮詢 / Line@ 聯繫我們' },
      footer,
    ],
    supplemental: [FAQ_SUPPLEMENT],
    finalCta: 'cta',
  },
  {
    route: '/blog',
    mockup: 'mockup-blog-page.png',
    handoff: 'blog-page-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區塊', spec: '內容創造價值，讓好品牌被更多人看見；山景背景 + 4 個重點 icon' },
      { key: 'categories', title: '分類導覽', spec: '全部文章 / SEO 優化 / 網站設計 / 內容行銷 / 數位工具 / 品牌經營 / 案例分享 / 產業觀點' },
      { key: 'featured', title: '精選文章', spec: '大圖 + 重點文章；內容來自 CMS，連到 /blog/<slug>' },
      { key: 'posts', title: '文章列表', spec: '圖文卡片 + 分類標籤；已發布文章連到文章內容頁' },
      { key: 'topics', title: '熱門主題', spec: 'icon + 分類名稱 + 整理中篇數' },
      { key: 'subscribe', title: '訂閱 CTA', spec: '電子報表單為展示版本（停用送出），改由 LINE@ 接收通知' },
      footer,
    ],
    supplemental: [FAQ_SUPPLEMENT],
    finalCta: 'subscribe',
  },
  {
    route: '/checkout',
    mockup: 'mockup-checkout-page.png',
    handoff: 'checkout-page-design-reference.png',
    sections: [
      { key: 'hero', title: 'Hero 區塊', spec: '選擇適合你的方案，開始打造品牌網站；清楚標示目前尚未開放正式付款' },
      { key: 'plans', title: '方案卡', spec: '產品方案卡；價格顯示方案整理中 / 客製報價，不寫 NT$ 金額' },
      { key: 'billing', title: '計費切換', spec: '月繳 / 年繳 / 一次購買切換外觀（示意）' },
      { key: 'payment-methods', title: '付款方式', spec: '銀行轉帳 / 綠界 / LINE Pay 預留；不收集卡號、全部停用' },
      { key: 'access-code', title: '權限代碼說明', spec: '完成付款 → 發送權限代碼 → 立即啟用' },
      { key: 'order-summary', title: '訂單摘要', spec: '方案、計費週期、金額狀態；付款按鈕停用，改為預約討論' },
      { key: 'trust', title: '安心購買資訊', spec: '付款資料由金流商處理、先確認再開單、專人協助（不寫未確認的退款承諾）' },
      { key: 'faq', title: 'FAQ / 備註', spec: '常見問題 + 右側 CTA 卡（預約討論）' },
      footer,
    ],
    supplemental: [],
    finalCta: 'faq',
  },
];

export function getMockupLayout(route: string): MockupPageLayout {
  const layout = MOCKUP_LAYOUTS.find((item) => item.route === route);
  if (!layout) throw new Error(`No mockup layout for ${route}`);
  return layout;
}
