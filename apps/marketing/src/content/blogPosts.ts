import type { IconFeature, IconName, PosterVisual } from './types';

export interface BlogCategory {
  slug: string;
  label: string;
  description: string;
  icon: IconName;
}

export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  points: string[];
  readingMinutes: number;
  status: 'upcoming';
  featured?: boolean;
  poster: PosterVisual;
}

/** 設計稿分類：全部文章為篩選預設值，不是分類 */
export const blogCategories: BlogCategory[] = [
  { slug: 'seo', label: 'SEO 優化', description: '網站架構、關鍵字與結構化資料。', icon: 'search' },
  { slug: 'web-design', label: '網站設計', description: '頁面規劃、版型選擇與上線前檢查。', icon: 'layout' },
  { slug: 'content-marketing', label: '內容行銷', description: '活動頁、文章與社群內容的安排。', icon: 'pen' },
  { slug: 'tools', label: '數位工具', description: '後台操作、網域設定與文章生產器。', icon: 'code' },
  { slug: 'brand', label: '品牌經營', description: '品牌介紹、服務說明與長期經營。', icon: 'heart' },
  { slug: 'case-sharing', label: '案例分享', description: '專案做法與整理方式。', icon: 'users' },
  { slug: 'insights', label: '產業觀點', description: '電商、金流與數位行銷的觀察。', icon: 'trend' },
];

export const blogHeroHighlights: IconFeature[] = [
  { icon: 'star', title: '實戰經驗分享', description: '做網站時實際遇到的問題' },
  { icon: 'trend', title: '產業趨勢解析', description: '電商與內容經營的變化' },
  { icon: 'book', title: '工具教學指南', description: '後台、網域與文章工具' },
  { icon: 'heart', title: '品牌成長思維', description: '讓網站能長期經營' },
];

/** 文章尚未發布：只顯示主題與重點，不連到不存在的文章頁 */
export const blogPosts: BlogPost[] = [
  {
    slug: 'new-site-seo-first-3-months',
    title: '新網站怎麼開始做 SEO？前 3 個月的內容安排',
    category: 'seo',
    excerpt: '從網站架構、內部連結到第一批文章主題，新網站前 3 個月可以先做的事。',
    points: ['先確認頁面架構與網址', '第一批文章主題怎麼選', '內部連結怎麼安排'],
    readingMinutes: 8,
    status: 'upcoming',
    featured: true,
    poster: { headline: 'SEO 起步', sub: 'SEO 優化', theme: 'blue' },
  },
  {
    slug: 'faq-schema-guide',
    title: 'FAQ 結構化資料怎麼寫？哪些問題適合放進 FAQ',
    category: 'seo',
    excerpt: 'FAQ 不是越多越好，挑客人真的會問的問題，回答要具體。',
    points: ['FAQPage 的基本格式', '適合與不適合的問題', '常見錯誤'],
    readingMinutes: 6,
    status: 'upcoming',
    poster: { headline: 'FAQ Schema', sub: 'SEO 優化', theme: 'teal' },
  },
  {
    slug: 'brand-site-structure',
    title: '品牌官網怎麼規劃？首頁、服務頁到案例頁的架構',
    category: 'web-design',
    excerpt: '先想清楚訪客要找什麼，再決定頁面順序與每頁要回答的問題。',
    points: ['首頁要先講哪件事', '服務頁怎麼分', '案例頁放什麼'],
    readingMinutes: 7,
    status: 'upcoming',
    poster: { headline: '官網架構', sub: '網站設計', theme: 'slate' },
  },
  {
    slug: 'launch-checklist',
    title: '網站上線前的檢查清單：手機版、表單與 SEO 設定',
    category: 'web-design',
    excerpt: '上線前花半小時逐項檢查，比上線後才發現問題省事。',
    points: ['手機與桌機畫面', '表單測試送出', 'SEO 標題與描述'],
    readingMinutes: 5,
    status: 'upcoming',
    poster: { headline: '上線檢查', sub: '網站設計', theme: 'green' },
  },
  {
    slug: 'landing-page-vs-website',
    title: '一頁式網頁和官網差在哪？什麼情況適合先做一頁',
    category: 'content-marketing',
    excerpt: '活動、課程與單一服務，常常一頁就足夠開始接單。',
    points: ['兩者的目的差異', '先做一頁的情況', '之後怎麼升級'],
    readingMinutes: 5,
    status: 'upcoming',
    poster: { headline: '一頁式 vs 官網', sub: '內容行銷', theme: 'purple' },
  },
  {
    slug: 'event-page-checklist',
    title: '活動報名頁要放哪些資訊，才不會一直被私訊問',
    category: 'content-marketing',
    excerpt: '時間、地點、費用與取消規則，參加者想知道的資訊先放上去。',
    points: ['第一屏的資訊', '流程怎麼呈現', '報名欄位要幾個'],
    readingMinutes: 6,
    status: 'upcoming',
    poster: { headline: '活動報名頁', sub: '內容行銷', theme: 'pink' },
  },
  {
    slug: 'ecommerce-payment-prep',
    title: '電商網站串金流前，要先準備哪些資料',
    category: 'insights',
    excerpt: '金流申請、退款規則與對帳流程，上線前就要想好。',
    points: ['金流商申請文件', '退款與取消規則', '對帳流程'],
    readingMinutes: 7,
    status: 'upcoming',
    poster: { headline: '金流準備', sub: '產業觀點', theme: 'amber' },
  },
  {
    slug: 'service-page-writing',
    title: '服務介紹頁怎麼寫：少一點形容詞，多一點具體說明',
    category: 'brand',
    excerpt: '客人想知道你做什麼、怎麼做、多久完成，而不是一串形容詞。',
    points: ['服務內容怎麼拆', '流程與時程', '常見問題'],
    readingMinutes: 6,
    status: 'upcoming',
    poster: { headline: '服務介紹頁', sub: '品牌經營', theme: 'red' },
  },
  {
    slug: 'custom-domain-dns',
    title: '自訂網域怎麼設定？CNAME、TXT 驗證與 www 網址',
    category: 'tools',
    excerpt: '把網域指到網站前，先分清楚根網域和 www 網址的差別。',
    points: ['CNAME 與 TXT 紀錄', '為什麼建議先用 www', '設定後多久生效'],
    readingMinutes: 5,
    status: 'upcoming',
    poster: { headline: '網域設定', sub: '數位工具', theme: 'slate' },
  },
  {
    slug: 'redeem-access-code',
    title: '權限代碼怎麼兌換：從收到代碼到建立第一個網站',
    category: 'tools',
    excerpt: '收到代碼後登入客戶後台兌換，選版型就能開始填內容。',
    points: ['代碼格式說明', '兌換前可以轉讓', '兌換後的下一步'],
    readingMinutes: 4,
    status: 'upcoming',
    poster: { headline: '權限代碼', sub: '數位工具', theme: 'teal' },
  },
  {
    slug: 'how-we-document-cases',
    title: '案例頁怎麼整理？為什麼我們先不放成效數字',
    category: 'case-sharing',
    excerpt: '需求、做法與使用產品先寫清楚，數據取得同意並統計完成後再公開。',
    points: ['案例要回答哪些問題', '畫面授權怎麼處理', '數據什麼時候公開'],
    readingMinutes: 5,
    status: 'upcoming',
    poster: { headline: '案例整理', sub: '案例分享', theme: 'blue' },
  },
];
