import type { Feature, LinkItem } from './types';

export interface SolutionScenario {
  key: string;
  tag: string;
  title: string;
  situation: string;
  needs: string[];
  recommended: LinkItem[];
  firstStep: string;
}

export const solutionScenarios: SolutionScenario[] = [
  {
    key: 'new-brand',
    tag: '起步',
    title: '新品牌起步',
    situation: '品牌剛成立，社群有在經營，但還沒有一個能完整介紹自己的地方。',
    needs: ['清楚的品牌與服務介紹', '聯絡方式與表單', '基本 SEO 設定'],
    recommended: [
      { label: 'SEO 形象官網', href: '/products/seo-website' },
      { label: '一頁式網頁', href: '/products/landing-page' },
    ],
    firstStep: '先整理 3–5 個主要服務，決定首頁要先講哪一件事。',
  },
  {
    key: 'redesign',
    tag: '翻新',
    title: '舊網站翻新',
    situation: '網站用了幾年，手機版跑版、內容改不動，也不確定 SEO 設定對不對。',
    needs: ['內容與網址盤點', '手機版面重新整理', '舊網址轉址規劃'],
    recommended: [
      { label: 'SEO 形象官網', href: '/products/seo-website' },
      { label: '客製服務', href: '/contact' },
    ],
    firstStep: '列出目前有流量或常被分享的頁面，翻新時優先保留。',
  },
  {
    key: 'seo-content',
    tag: '內容',
    title: 'SEO 內容累積',
    situation: '網站已經上線，但很少有人從搜尋進來，也不知道該寫什麼。',
    needs: ['關鍵字與主題規劃', '文章結構一致', 'FAQ 與結構化資料'],
    recommended: [
      { label: 'SEO 文章生產器', href: '/products/seo-article-generator' },
      { label: 'SEO 形象官網', href: '/products/seo-website' },
    ],
    firstStep: '從客人最常問的 10 個問題開始，整理成文章主題。',
  },
  {
    key: 'campaign',
    tag: '檔期',
    title: '活動短期轉換',
    situation: '有一檔活動、課程或團購，需要在短時間內說清楚並收報名。',
    needs: ['一頁說清楚活動資訊', '報名或下單表單', '社群圖與宣傳頁'],
    recommended: [
      { label: '一頁式網頁', href: '/products/landing-page' },
      { label: '活動 DM / 宣傳頁', href: '/products/promo-page-design' },
    ],
    firstStep: '確認截止時間與要收集的報名欄位，再決定頁面區塊。',
  },
  {
    key: 'booking',
    tag: '預約',
    title: '美業 / 店家預約',
    situation: '預約都靠私訊，服務項目、時段與注意事項要一再重複回答。',
    needs: ['服務項目與價格說明', '預約時段規則', '預約表單紀錄'],
    recommended: [
      { label: '預約表單頁', href: '/products/landing-page/booking-form' },
      { label: 'SEO 形象官網', href: '/products/seo-website' },
    ],
    firstStep: '把服務項目、時間長度與取消規則整理成一張表。',
  },
  {
    key: 'b2b',
    tag: 'B2B',
    title: 'B2B 形象與詢價',
    situation: '客戶多半會先上網查公司資料，再決定要不要聯絡詢價。',
    needs: ['產品或服務規格說明', '合作流程與案例', '詢價表單分類'],
    recommended: [
      { label: 'SEO 形象官網', href: '/products/seo-website' },
      { label: '客製服務', href: '/contact' },
    ],
    firstStep: '整理常被詢問的規格與交期資訊，放進服務頁。',
  },
  {
    key: 'ecommerce',
    tag: '電商',
    title: '電商與商品展示',
    situation: '商品越來越多，私訊接單和對帳開始花掉太多時間。',
    needs: ['商品分類與規格', '結帳與金流流程', '訂單管理後台'],
    recommended: [
      { label: '電商網站', href: '/products/ecommerce-website' },
      { label: '團購促銷頁', href: '/products/landing-page/group-buy-promo' },
    ],
    firstStep: '先列出商品規格、運送方式與希望支援的付款方式。',
  },
];

export const solutionSteps: Feature[] = [
  { title: '說明目前的狀況', description: '網站目的、現有素材、希望上線的時間與預算範圍。' },
  { title: '整理頁面與功能', description: '列出第一版需要的頁面、表單與後台功能。' },
  { title: '建議自助或客製', description: '版型能涵蓋就用自助建站；需要特殊流程再客製報價。' },
];
