import { mediaAssets } from './media';
import type { ChipItem, IconFeature, LinkItem, RailCard, TimelineStep } from './types';

/**
 * 產品頁版型內容（Phase 2.6B，依各產品設計稿的區塊順序）。
 * sections 的順序就是頁面輸出的順序；key 對應 mockupLayout.ts 與 data-section。
 * 設計稿上的成效數字、客戶名稱與金額一律改寫為產品事實或「示意」標記。
 */
export type ProductSectionKind = 'pain' | 'icons' | 'band' | 'timeline' | 'industries' | 'cards' | 'tool-ui' | 'plans' | 'faq' | 'cta';

export interface GeneratorPlan {
  name: string;
  audience: string;
  priceDisplay: string;
  quota: string;
  features: string[];
  cta: LinkItem;
  highlight?: boolean;
}

export interface ProductSection {
  key: string;
  kind: ProductSectionKind;
  title: string;
  description?: string;
  action?: LinkItem;
  items?: IconFeature[];
  columns?: 3 | 4 | 5 | 6;
  align?: 'center' | 'left';
  tone?: 'white' | 'mist' | 'mountain';
  cardLayout?: 'row' | 'grid';
  steps?: TimelineStep[];
  cards?: RailCard[];
  layout?: 'rail' | 'grid';
  perRow?: 4 | 5 | 6;
  portrait?: boolean;
  chips?: ChipItem[];
  plans?: GeneratorPlan[];
  primary?: LinkItem;
  secondary?: LinkItem;
  script?: string;
  note?: string;
}

export interface ProductHeroContent {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle: string;
  lead: string;
  primary: LinkItem;
  secondary: LinkItem;
  tertiary?: LinkItem;
  features: IconFeature[];
  badges: string[];
  script?: string;
  notice?: string;
}

export interface ProductLayout {
  slug: string;
  hero: ProductHeroContent;
  sections: ProductSection[];
}

export const ECOMMERCE_NOTICE = '目前第一版以展示與客製討論為主，正式金流串接依專案需求確認。';

export const productLayouts: ProductLayout[] = [
  {
    slug: 'seo-website',
    hero: {
      eyebrow: '讓品牌被看見，讓專業被信任',
      title: 'SEO 形象官網',
      highlight: '形象官網',
      subtitle: '不只是網站，更是你的數位業務',
      lead: '為中小企業與品牌規劃的形象官網：版型已排好 SEO 結構，每一頁的標題、描述、FAQ 與結構化資料都在後台設定，上線後內容自己更新。',
      primary: { label: '查看方案', href: '/checkout' },
      secondary: { label: '看作品', href: '/cases' },
      tertiary: { label: 'Line@ 詢問', href: 'line' },
      features: [
        { icon: 'search', title: 'SEO 搜尋優化', description: '每頁獨立 SEO 欄位' },
        { icon: 'layout', title: '專業形象設計', description: '版型依產業規劃' },
        { icon: 'smartphone', title: '響應式設計', description: '手機、平板、電腦' },
        { icon: 'target', title: '轉換導向', description: '詢問與預約入口清楚' },
      ],
      badges: ['被搜尋到，也被信任', '後台自行更新內容'],
      script: 'Good Design, Better Business',
    },
    sections: [
      {
        key: 'pain-points',
        kind: 'pain',
        title: '你是否也遇到這些困擾？',
        description: '許多中小企業明明有好產品與服務，卻在網路上不容易被找到。',
        items: [
          { icon: 'shield', title: '缺乏品牌信任感', description: '網站過於簡單或資訊不完整，訪客很難產生信任。' },
          { icon: 'search', title: '搜尋不到你的網站', description: '有官網卻搜尋不到，潛在客人被其他網站帶走。' },
          { icon: 'file', title: '內容不夠清楚', description: '服務項目、優勢與聯絡方式不明確，訪客不知道下一步。' },
        ],
      },
      {
        key: 'solutions',
        kind: 'band',
        title: '我們提供完整的解決方案',
        description: '從架構、版面到 SEO 設定，把形象官網需要的區塊一次規劃好。',
        action: { label: '查看方案', href: '/checkout' },
        columns: 6,
        items: [
          { icon: 'image', title: '品牌形象區塊', description: '主視覺與品牌故事，第一眼說清楚你是誰' },
          { icon: 'list', title: '服務介紹區塊', description: '服務項目與流程，分段呈現核心優勢' },
          { icon: 'help', title: 'FAQ 常見問題', description: '回答常見問題，同步輸出 FAQ Schema' },
          { icon: 'target', title: '轉換行動區', description: '預約、詢問與 LINE@ 按鈕放在該出現的位置' },
          { icon: 'search', title: 'SEO 基礎設定', description: '標題、描述、Canonical 與 sitemap' },
          { icon: 'smartphone', title: '響應式設計', description: '手機、平板與桌機逐一檢查版面' },
        ],
      },
      {
        key: 'process',
        kind: 'timeline',
        title: '5 個步驟，完成專屬官網',
        description: '你負責提供內容，我們協助把結構與設定做好。',
        action: { label: '了解開通流程', href: '/checkout' },
        steps: [
          { icon: 'message', title: '需求諮詢', description: '了解你的目標與需求' },
          { icon: 'users', title: '企劃規劃', description: '網站架構與內容規劃' },
          { icon: 'layout', title: '設計製作', description: '套用版型與視覺調整' },
          { icon: 'file', title: '內容上架', description: '文案與圖片填入欄位' },
          { icon: 'rocket', title: '正式上線', description: '預覽確認後發布' },
        ],
      },
      {
        key: 'industries',
        kind: 'industries',
        title: '適合各種產業，打造專屬的品牌官網',
        description: '服務業、製造業或個人品牌，都能依產業調整頁面架構。',
        items: [
          { icon: 'utensils', title: '餐飲美食', description: '菜單介紹、線上訂位入口' },
          { icon: 'home', title: '生活服務', description: '預約諮詢、服務介紹' },
          { icon: 'building', title: '專業顧問', description: '專業形象、案例分享' },
          { icon: 'store', title: '電商零售', description: '產品展示、聯絡詢價' },
          { icon: 'medical', title: '醫療健康', description: '醫療資訊、預約諮詢' },
          { icon: 'graduation', title: '教育培訓', description: '課程介紹、報名表單' },
        ],
      },
      {
        key: 'showcase',
        kind: 'cards',
        title: '精選作品，看看不同行業的網站方向',
        description: '案例畫面取得授權後才會公開，以下為案例與版型方向示意。',
        action: { label: '更多作品', href: '/cases' },
        layout: 'rail',
        perRow: 4,
        tone: 'white',
        cards: [
          { title: 'Hungjui 形象官網', tag: '形象官網', description: '服務介紹、FAQ 與每頁 SEO 設定。', image: mediaAssets.seoWebsiteHero, note: '示意畫面', href: '/cases', linkLabel: '看案例方向' },
          { title: '室內設計工作室版型', tag: '設計服務', description: '作品集、服務流程與預約諮詢。', visual: 'website', note: '版型示意' },
          { title: '在地茶飲品牌版型', tag: '食品飲料', description: '品牌故事、門市資訊與產品介紹。', poster: { headline: '山茶日常', sub: '食品飲料・形象官網', theme: 'green' } },
          { title: '心理諮商所版型', tag: '專業服務', description: '服務說明、諮商流程與預約表單。', visual: 'website', note: '版型示意' },
        ],
      },
      { key: 'faq', kind: 'faq', title: '常見問題', description: '整理客戶最常詢問的問題，幫你快速了解 SEO 形象官網。' },
      {
        key: 'cta',
        kind: 'cta',
        title: '現在就開始，打造屬於你的 SEO 形象官網',
        description: '把服務說清楚，讓搜尋進來的人知道怎麼聯絡你。',
        primary: { label: '查看方案', href: '/checkout' },
        secondary: { label: 'Line@ 詢問', href: 'line' },
        script: '好的網站，帶來更多可能',
      },
    ],
  },
  {
    slug: 'landing-page',
    hero: {
      eyebrow: '團購・活動・課程・預約',
      title: '一頁式網頁',
      highlight: '網頁',
      subtitle: '把你的想法，變成會帶來行動的頁面',
      lead: '為團購、活動、課程、預約等行銷情境設計：一個頁面說清楚重點，訪客往下滑就能報名或詢問。',
      primary: { label: '立即建立一頁式網頁', href: '/checkout' },
      secondary: { label: '觀看範例', href: '#examples' },
      tertiary: { label: 'Line@ 詢問', href: 'line' },
      features: [
        { icon: 'zap', title: '快速上線', description: '選頁型、填內容就能預覽' },
        { icon: 'code', title: '不需寫程式', description: '欄位化編輯內容' },
        { icon: 'target', title: '轉換導向版型', description: '依行銷情境規劃區塊' },
        { icon: 'headset', title: '專人技術支援', description: '上線前後都有人協助' },
      ],
      badges: ['手機閱讀優先', '表單直接收資料'],
      script: 'Your Story, One Page',
    },
    sections: [
      {
        key: 'scenarios',
        kind: 'cards',
        title: '適合這些使用情境',
        description: '不論你是個人、團隊或企業，一頁式網頁都能幫你把一件事說清楚。',
        layout: 'grid',
        perRow: 6,
        tone: 'white',
        cards: [
          { title: '商品團購', tag: '團購銷售', description: '快速開團，收單更輕鬆', poster: { headline: '限時團購', sub: '團購促銷頁', theme: 'red' }, href: '/products/landing-page/group-buy-promo', linkLabel: '看頁型結構' },
          { title: '活動報名', tag: '活動行銷', description: '線上報名，活動資訊一次看懂', poster: { headline: '活動報名', sub: '活動報名頁', theme: 'purple' }, href: '/products/landing-page/event-registration', linkLabel: '看頁型結構' },
          { title: '課程招生', tag: '課程招生', description: '課程介紹，立即報名', poster: { headline: '課程招生', sub: '課程招生頁', theme: 'slate' }, href: '/products/landing-page/course-enrollment', linkLabel: '看頁型結構' },
          { title: '預約諮詢', tag: '預約服務', description: '服務說明，線上預約', poster: { headline: '預約諮詢', sub: '預約表單頁', theme: 'teal' }, href: '/products/landing-page/booking-form', linkLabel: '看頁型結構' },
          { title: '商品發表', tag: '新品發表', description: '聚焦亮點，收集名單', poster: { headline: '新品上市', sub: '商品發表頁', theme: 'blue' } },
          { title: '專案計畫', tag: '募集計畫', description: '講述理念，爭取支持', poster: { headline: '專案計畫', sub: '計畫說明頁', theme: 'green' } },
        ],
      },
      {
        key: 'pain-points',
        kind: 'band',
        title: '你是否也遇過這些困擾？',
        description: '行銷活動很重要，但製作頁面常常卡在時間、成本與技術。',
        cardLayout: 'row',
        script: 'Turn Ideas Into Action',
        items: [
          { icon: 'clock', title: '製作時間太長', description: '每次都要等設計、開發，活動時機容易錯過。' },
          { icon: 'wallet', title: '成本過高', description: '只是一個活動頁面，卻要花一筆不小的預算。' },
          { icon: 'code', title: '技術門檻高', description: '不會寫程式，修改內容也很麻煩。' },
          { icon: 'trend', title: '轉換效果不佳', description: '頁面不夠聚焦，訪客看完不知道下一步。' },
        ],
      },
      {
        key: 'modules',
        kind: 'icons',
        title: '模組化設計，依需要組合頁面區塊',
        description: '版型已規劃常用區塊，填入內容就能組成完整的一頁式網頁。',
        columns: 6,
        tone: 'mist',
        items: [
          { icon: 'layout', title: 'Hero 首屏', description: '吸睛標題・主視覺' },
          { icon: 'star', title: '賣點區塊', description: '圖文呈現・說明價值' },
          { icon: 'calendar', title: '活動議程', description: '時間表・內容介紹' },
          { icon: 'file', title: '表單區塊', description: '報名／預約／收單' },
          { icon: 'help', title: '常見問題', description: '解除疑慮・減少私訊' },
          { icon: 'target', title: '行動呼籲', description: '多個 CTA，引導行動' },
        ],
      },
      {
        key: 'benefits',
        kind: 'icons',
        title: '功能重點',
        description: '上線速度、編輯方式與後續管理，一頁式網頁都整理好了。',
        columns: 4,
        align: 'left',
        tone: 'white',
        items: [
          { icon: 'zap', title: '快速上線', description: '選好頁型就能開始填內容，不必等整個官網。' },
          { icon: 'code', title: '免寫程式', description: '文字、圖片與表單欄位都在後台編輯。' },
          { icon: 'receipt', title: '表單紀錄', description: '報名與預約資料集中在後台，方便整理。' },
          { icon: 'headset', title: '技術支援', description: '上線前後遇到問題，都可以詢問。' },
        ],
      },
      {
        key: 'examples',
        kind: 'cards',
        title: '精選範例，看看一頁式網頁的應用',
        description: '以下為版型與情境示意，不是實際客戶成效。',
        action: { label: '看頁型結構', href: '/products/landing-page/event-registration' },
        layout: 'rail',
        perRow: 5,
        tone: 'mountain',
        cards: [
          { title: '手作甜點團購', tag: '餐飲美食', description: '商品介紹、團購規則與收單表單。', poster: { headline: '手作甜點', sub: '團購頁示意', theme: 'pink' }, note: '示意' },
          { title: '音樂祭活動', tag: '娛樂活動', description: '活動資訊、議程與報名入口。', poster: { headline: '音樂祭', sub: '活動報名頁示意', theme: 'purple' }, note: '示意' },
          { title: '攝影線上課程', tag: '線上課程', description: '課程大綱、講師介紹與報名。', poster: { headline: '攝影課', sub: '課程招生頁示意', theme: 'slate' }, note: '示意' },
          { title: '健身體驗課程', tag: '運動健身', description: '體驗方案、時段選擇與預約。', poster: { headline: '體驗課', sub: '預約頁示意', theme: 'blue' }, note: '示意' },
          { title: '戶外登山行程', tag: '旅遊體驗', description: '行程介紹、裝備清單與報名。', image: mediaAssets.landingPageHero, note: '示意畫面' },
        ],
      },
      {
        key: 'process',
        kind: 'timeline',
        title: '從購買到上線，只要 5 個步驟',
        description: '簡單、快速、不需要技術背景，讓想法盡快上線。',
        steps: [
          { icon: 'cart', title: '選擇方案', description: '依需求選擇適合的方案' },
          { icon: 'layout', title: '套用版型', description: '挑選頁型快速套用' },
          { icon: 'pen', title: '編輯內容', description: '替換文字、圖片，設定表單' },
          { icon: 'eye', title: '預覽確認', description: '手機、電腦雙版預覽' },
          { icon: 'rocket', title: '發佈上線', description: '確認後發布，分享連結推廣' },
        ],
      },
      { key: 'faq', kind: 'faq', title: '常見問題', description: '關於一頁式網頁的常見疑問，幫你快速解答。' },
      {
        key: 'cta',
        kind: 'cta',
        title: '現在就開始，打造屬於你的一頁式網頁',
        description: '用一個頁面，把活動、課程或服務說清楚，讓人直接行動。',
        primary: { label: '立即建立一頁式網頁', href: '/checkout' },
        secondary: { label: '聯絡我們諮詢', href: '/contact' },
        script: '一個頁面，無限可能',
      },
    ],
  },
  {
    slug: 'ecommerce-website',
    hero: {
      eyebrow: '品牌電商・從想法到上線',
      title: '電商網站',
      subtitle: '打造會賣的品牌電商平台',
      lead: '不只是開店，而是依你的品牌規劃商品、金流、物流與行銷工具，讓客人容易找到商品、順利完成下單。',
      primary: { label: '客製詢問', href: '/contact' },
      secondary: { label: '查看方案', href: '/checkout' },
      tertiary: { label: 'Line@ 客製詢問', href: 'line' },
      features: [
        { icon: 'layout', title: '專屬品牌設計', description: '依品牌調整購物體驗' },
        { icon: 'cart', title: '完整電商功能', description: '金流、物流、行銷規劃' },
        { icon: 'smartphone', title: '響應式設計', description: '手機、平板、電腦版面檢查' },
        { icon: 'layers', title: '彈性擴充', description: '隨業務需求分階段擴充' },
      ],
      badges: ['從品牌到訂單', '依流程分階段規劃'],
      notice: ECOMMERCE_NOTICE,
    },
    sections: [
      {
        key: 'pain-points',
        kind: 'pain',
        title: '你是否也遇到這些電商經營困擾？',
        description: '經營電商的挑戰很多，我們先把流程整理清楚，再決定需要的功能。',
        items: [
          { icon: 'box', title: '商品管理複雜', description: '商品規格多、庫存難管理，上架修改耗時費力。' },
          { icon: 'credit-card', title: '金流串接困難', description: '不確定如何串接信用卡、ATM 與行動支付等付款方式。' },
          { icon: 'truck', title: '物流配送整合', description: '出貨流程繁瑣，宅配與超商取貨難以整合。' },
          { icon: 'star', title: '品牌形象不夠突出', description: '通用開店平台版型制式，難以展現品牌特色。' },
        ],
      },
      {
        key: 'solutions',
        kind: 'band',
        title: '我們提供更完整的電商解決方案',
        description: '結合設計、技術與行銷思維，依你的商品與目標規劃電商網站。',
        action: { label: '預約討論', href: '/contact' },
        cardLayout: 'row',
        items: [
          { icon: 'layout', title: '專屬設計', description: '依品牌調性規劃視覺與購物體驗。' },
          { icon: 'cart', title: '完整功能', description: '金流、物流、訂單與行銷工具一起規劃。' },
          { icon: 'layers', title: '彈性擴充', description: '隨業務成長擴充功能，串接第三方服務。' },
          { icon: 'headset', title: '專業支援', description: '上線前後提供技術與營運諮詢（依合約範圍）。' },
        ],
      },
      {
        key: 'features',
        kind: 'icons',
        title: '電商網站核心功能',
        description: '從開店到成長，需要的功能先一次規劃清楚。',
        note: ECOMMERCE_NOTICE,
        columns: 6,
        tone: 'white',
        items: [
          { icon: 'box', title: '商品管理', description: '多規格商品、庫存管理、分類與批次上架' },
          { icon: 'credit-card', title: '金流整合', description: '規劃信用卡、ATM、LINE Pay 與轉帳，依金流商審核開通' },
          { icon: 'truck', title: '物流串接', description: '宅配、超商取貨與出貨單流程規劃' },
          { icon: 'receipt', title: '訂單管理', description: '後台訂單整理、退換貨與報表' },
          { icon: 'tag', title: '優惠活動', description: '折扣碼、會員制度、滿額與限時優惠' },
          { icon: 'search', title: 'SEO 基礎', description: '友善網站結構與商品頁 SEO 設定' },
        ],
      },
      {
        key: 'process',
        kind: 'timeline',
        title: '從諮詢到上線，簡單 5 步驟',
        description: '每一步先確認範圍，再進入下一步。',
        steps: [
          { icon: 'message', title: '諮詢需求', description: '了解你的商品與目標' },
          { icon: 'list', title: '企劃規劃', description: '網站架構與功能規劃' },
          { icon: 'code', title: '設計開發', description: '視覺設計與系統開發' },
          { icon: 'check-circle', title: '測試上線', description: '功能測試與內容建置' },
          { icon: 'refresh', title: '持續優化', description: '數據追蹤與後續支援' },
        ],
      },
      {
        key: 'industries',
        kind: 'industries',
        title: '適合各種產業與品牌類型',
        description: '實體品牌轉型或全新電商品牌，都能依商品特性規劃。',
        items: [
          { icon: 'home', title: '生活居家', description: '居家用品・生活雜貨' },
          { icon: 'sparkles', title: '美妝保養', description: '保養彩妝・個人護理' },
          { icon: 'coffee', title: '食品飲品', description: '特色食品・保健營養' },
          { icon: 'shirt', title: '服飾配件', description: '潮流服飾・品牌配件' },
          { icon: 'cpu', title: '3C 與周邊', description: '電子產品・配件周邊' },
          { icon: 'brush', title: '文創設計', description: '文創商品・手作禮物' },
        ],
      },
      {
        key: 'showcase',
        kind: 'cards',
        title: '精選電商網站案例 / 版型',
        description: '不同產業、不同風格的電商版型方向，以下為示意畫面。',
        layout: 'rail',
        perRow: 5,
        tone: 'mountain',
        chips: [
          { key: 'all', label: '全部' },
          { key: 'home', label: '生活居家' },
          { key: 'beauty', label: '美妝保養' },
          { key: 'food', label: '食品飲品' },
          { key: 'fashion', label: '服飾配件' },
          { key: 'tech', label: '3C 科技' },
          { key: 'craft', label: '文創設計' },
        ],
        cards: [
          { title: '自然選物電商', tag: '生活居家', description: '簡約・清新・生活感', image: mediaAssets.ecommerceBackupA, note: '版型示意', filterTags: ['home'] },
          { title: '保養品牌電商', tag: '美妝保養', description: '質感・專業・商品規格清楚', image: mediaAssets.ecommerceBackupB, note: '版型示意', filterTags: ['beauty'] },
          { title: '食品品牌電商', tag: '食品飲品', description: '溫暖・在地特色', poster: { headline: '手作醬料', sub: '食品電商版型', theme: 'amber' }, filterTags: ['food'] },
          { title: '服飾品牌電商', tag: '服飾配件', description: '時尚・俐落・年輕族群', poster: { headline: '秋冬新品', sub: '服飾電商版型', theme: 'slate' }, filterTags: ['fashion'] },
          { title: '3C 周邊電商', tag: '3C 科技', description: '科技・現代・功能導向', poster: { headline: '智慧生活', sub: '3C 電商版型', theme: 'blue' }, filterTags: ['tech'] },
          { title: '文創禮品電商', tag: '文創設計', description: '手作・溫度・禮品包裝', poster: { headline: '手作禮物', sub: '文創電商版型', theme: 'pink' }, filterTags: ['craft'] },
        ],
      },
      { key: 'faq', kind: 'faq', title: '常見問題', description: '關於電商網站建置，你可能想知道的問題。' },
      {
        key: 'cta',
        kind: 'cta',
        title: '準備打造專屬的電商網站了嗎？',
        description: '從品牌到訂單，森映陪你規劃第一版電商網站。',
        primary: { label: 'Line@ 客製詢問', href: 'line' },
        secondary: { label: '查看方案', href: '/checkout' },
        note: ECOMMERCE_NOTICE,
      },
    ],
  },
  {
    slug: 'promo-page-design',
    hero: {
      eyebrow: '好的設計，讓活動被看見',
      title: '活動 DM / 宣傳頁設計',
      subtitle: '用視覺放大你的行銷力',
      lead: '節慶活動、檔期促銷、新品上市或品牌宣傳：先整理活動資訊，再設計成社群圖、宣傳頁與印刷 DM，讓訊息被看見、被記住。',
      primary: { label: '立即諮詢設計', href: '/contact' },
      secondary: { label: '查看作品', href: '#featured-cases' },
      tertiary: { label: 'Line@ 詢問', href: 'line' },
      features: [
        { icon: 'users', title: '專業設計團隊', description: '行銷 × 視覺整合' },
        { icon: 'clock', title: '時程先確認', description: '依活動檔期安排' },
        { icon: 'layers', title: '多元格式', description: '印刷／數位皆可' },
        { icon: 'star', title: '視覺一致', description: '一套視覺延伸各尺寸' },
      ],
      badges: ['社群圖・宣傳頁・印刷 DM'],
      script: 'Design for a Brighter Tomorrow',
    },
    sections: [
      {
        key: 'featured-cases',
        kind: 'cards',
        title: '精選活動案例',
        description: '各式產業、不同目的的活動視覺方向。以下為設計示意，不是實際客戶成效。',
        action: { label: '查看更多案例', href: '/cases' },
        layout: 'rail',
        perRow: 5,
        portrait: true,
        tone: 'white',
        cards: [
          { title: '新春檔期 DM', tag: '百貨零售', description: '新春檔期 DM', poster: { headline: '新春檔期', sub: '滿額禮・限時優惠', theme: 'red' } },
          { title: '春季美妝節', tag: '美妝保養', description: '春季促銷宣傳', poster: { headline: '春季美妝節', sub: '新品體驗・滿額折扣', theme: 'pink' } },
          { title: '旅遊活動 DM', tag: '旅遊觀光', description: '旅遊活動 DM', image: mediaAssets.promoPageExamplesA, imageClass: 'object-[50%_40%]', note: '設計示意' },
          { title: '新品上市 DM', tag: '餐飲美食', description: '新品上市 DM', poster: { headline: '美味時刻', sub: '新品上市・限時嘗鮮', theme: 'amber' } },
          { title: '招生宣傳頁', tag: '教育課程', description: '招生宣傳頁', poster: { headline: '從學習開始', sub: '課程招生・早鳥報名', theme: 'blue' } },
        ],
      },
      {
        key: 'scenarios',
        kind: 'icons',
        title: '適用情境，讓設計發揮最大效益',
        description: '不論任何時機，設計都能為你的品牌加分。',
        columns: 4,
        tone: 'white',
        script: 'More Than Design',
        items: [
          { icon: 'gift', title: '節慶活動', description: '新年、情人節、聖誕節等節慶主題行銷' },
          { icon: 'tag', title: '檔期促銷', description: '週年慶、百貨檔期、限時優惠' },
          { icon: 'box', title: '新品上架', description: '新品發表、產品推廣、試用活動' },
          { icon: 'megaphone', title: '品牌宣傳', description: '品牌形象、企業活動、展覽活動' },
        ],
      },
      {
        key: 'visual-benefits',
        kind: 'band',
        title: '設計不只是好看，更是有效的視覺溝通',
        description: '好的 DM 設計能在短時間內傳遞重點，讓人看懂活動、知道下一步。',
        columns: 4,
        items: [
          { icon: 'eye', title: '提升關注度', description: '版面層次清楚，吸引目光' },
          { icon: 'heart', title: '強化品牌印象', description: '建立一致的視覺識別' },
          { icon: 'target', title: '清楚的行動入口', description: '報名、購買與 LINE@ 連結明確' },
          { icon: 'users', title: '傳遞核心訊息', description: '複雜資訊也能簡單傳達' },
        ],
      },
      {
        key: 'services',
        kind: 'icons',
        title: '我們提供的服務',
        description: '從企劃到完稿，依活動需要選擇服務項目。',
        columns: 5,
        tone: 'mist',
        items: [
          { icon: 'brush', title: '主視覺設計', description: '活動主視覺・版面設計・圖文整合' },
          { icon: 'type', title: '文案排版', description: '重點提煉・文案整理・閱讀層次' },
          { icon: 'image', title: '多版本輸出', description: '印刷版・數位版・各尺寸客製' },
          { icon: 'printer', title: '印刷協助', description: '材質建議・發印支援' },
          { icon: 'refresh', title: '上線後調整', description: '依活動回饋調整版本，下一檔延續使用' },
        ],
      },
      {
        key: 'process',
        kind: 'timeline',
        title: '製作流程，簡單 5 步驟',
        description: '從需求到交付，每一步都先確認再進行。',
        steps: [
          { icon: 'message', title: '需求溝通', description: '了解活動目標與需求' },
          { icon: 'file', title: '企劃提案', description: '提供設計方向與報價' },
          { icon: 'pen', title: '設計製作', description: '視覺設計・文案編排' },
          { icon: 'check-circle', title: '確認調整', description: '修改調整・定稿確認' },
          { icon: 'download', title: '交付檔案', description: '提供各式檔案格式' },
        ],
      },
      {
        key: 'style-examples',
        kind: 'cards',
        title: '設計風格範例',
        description: '多元風格 × 產業經驗，依品牌調性選擇視覺方向。',
        layout: 'grid',
        perRow: 5,
        tone: 'white',
        cards: [
          { title: '簡約質感', tag: '簡約質感', description: '高雅・品牌形象', image: mediaAssets.promoPageExamplesB, note: '設計示意' },
          { title: '美食餐飲', tag: '美食餐飲', description: '美味・吸引食慾', poster: { headline: '義式餐酒', sub: '美食餐飲風格', theme: 'amber' } },
          { title: '活潑繽紛', tag: '活潑繽紛', description: '年輕・有趣・吸睛', poster: { headline: '夏日特賣', sub: '活潑繽紛風格', theme: 'pink' } },
          { title: '典雅大氣', tag: '典雅大氣', description: '傳統・文化・質感', poster: { headline: '中秋月圓', sub: '典雅大氣風格', theme: 'red' } },
          { title: '科技現代', tag: '科技現代', description: '創新・專業・未來感', poster: { headline: '科技新視界', sub: '科技現代風格', theme: 'purple' } },
        ],
      },
      { key: 'faq', kind: 'faq', title: '常見問題', description: '活動 DM 與宣傳頁設計常見的問題。' },
      {
        key: 'cta',
        kind: 'cta',
        title: '讓你的活動，被更多人看見',
        description: '從活動資訊整理到視覺交付，森映陪你做出清楚好讀的宣傳內容。',
        primary: { label: '立即諮詢設計', href: '/contact' },
        secondary: { label: 'Line@ 詢問', href: 'line' },
        script: '好的設計，創造更多可能',
      },
    ],
  },
  {
    slug: 'seo-article-generator',
    hero: {
      eyebrow: '內容產品・目前為森映內部工具',
      title: 'SEO 文章生產器',
      subtitle: '用 AI 高效產出符合搜尋意圖的優質文章',
      lead: '輸入品牌資料與關鍵字，產出含 SEO 標題、H2/H3、FAQ 與 FAQ Schema 的文章草稿。目前為內部使用，之後依方案開放；AI 草稿需要人工審稿，也不保證搜尋排名。',
      primary: { label: '預約討論', href: '/contact' },
      secondary: { label: '看工具介面', href: '#tool-ui' },
      tertiary: { label: 'Line@ 登記通知', href: 'line' },
      features: [
        { icon: 'search', title: '結合 SEO 結構', description: '標題、H2/H3 與 FAQ 一次產出' },
        { icon: 'code', title: '結構化資料', description: 'FAQ Schema（JSON-LD）' },
        { icon: 'check-circle', title: '人工審稿流程', description: '發布前一定經過確認' },
        { icon: 'key', title: '依方案開放', description: '權限代碼與額度規劃中' },
      ],
      badges: ['SEO 欄位檢查', '禁止詞標示'],
    },
    sections: [
      {
        key: 'pain-points',
        kind: 'pain',
        title: '內容創作，是否也遇到這些困難？',
        description: '優質的 SEO 內容很重要，但製作過程常常卡關。',
        items: [
          { icon: 'search', title: '不知道寫什麼主題', description: '缺乏關鍵字發想，不確定讀者想看什麼內容。' },
          { icon: 'clock', title: '寫作耗時費力', description: '從資料整理到撰寫完成，往往需要好幾個小時。' },
          { icon: 'bar-chart', title: 'SEO 結構不夠完整', description: '缺少標題層級、內部連結與結構化資料。' },
          { icon: 'file', title: '內容品質不穩定', description: '每篇結構與語氣不一致，難以維持品質。' },
        ],
      },
      {
        key: 'solutions',
        kind: 'band',
        title: '森映 SEO 文章生產器，讓內容流程更穩定',
        description: '把品牌資料、關鍵字研究與文章結構整理成固定流程：AI 產出草稿，人工確認後才發布。',
        script: 'Good Content, Clear Structure',
      },
      {
        key: 'features',
        kind: 'icons',
        title: '主要功能，對應內容製作的每一步',
        description: '從關鍵字到可上稿的 HTML，都在同一個流程裡。',
        columns: 6,
        tone: 'white',
        items: [
          { icon: 'search', title: '關鍵字輸入', description: '輸入主題與關鍵字，整理搜尋意圖與相關問題', href: '#tool-ui' },
          { icon: 'file', title: '文章草稿', description: '產出包含標題、大綱與段落的文章草稿', href: '#tool-ui' },
          { icon: 'code', title: 'HTML 輸出', description: '輸出乾淨的 HTML，可貼到網站後台', href: '#workflow' },
          { icon: 'help', title: 'FAQ Schema', description: '整理常見問題並輸出 FAQPage 結構化資料', href: '#workflow' },
          { icon: 'gauge', title: '額度管理', description: '依方案設定可生成的文章數量', href: '#plans' },
          { icon: 'key', title: '權限代碼', description: '以權限代碼開通，管理成員使用權限', href: '#plans' },
        ],
      },
      {
        key: 'tool-ui',
        kind: 'tool-ui',
        title: '簡潔直覺的操作介面',
        description: '輸入主題、產生內容、檢查後匯出。以下為介面示意，欄位目前無法操作。',
      },
      {
        key: 'workflow',
        kind: 'timeline',
        title: '從主題到上線，只需 5 個步驟',
        description: '固定的流程，讓內容製作有穩定的節奏。',
        steps: [
          { icon: 'file', title: '輸入主題', description: '輸入關鍵字，設定目標條件' },
          { icon: 'sparkles', title: 'AI 生成', description: '產出文章大綱與完整草稿' },
          { icon: 'pen', title: '編輯優化', description: '調整內容、加入品牌觀點' },
          { icon: 'code', title: '匯出 HTML', description: '產生可上稿的 HTML 格式' },
          { icon: 'rocket', title: '發佈上線', description: '貼上網站後台，發布後持續更新' },
        ],
      },
      {
        key: 'plans',
        kind: 'plans',
        title: '彈性方案，滿足不同規模的需求',
        description: '客戶版與使用額度規劃中，以下為方案方向；正式內容以公告與確認報價為準。',
        plans: [
          {
            name: '入門方案',
            audience: '適合個人創作者',
            priceDisplay: '方案整理中',
            quota: '文章額度規劃中',
            features: ['關鍵字與文章草稿', '基本 FAQ 結構', 'Email 支援'],
            cta: { label: '登記開放通知', href: 'line' },
          },
          {
            name: '專業方案',
            audience: '適合中小企業',
            priceDisplay: '方案整理中',
            quota: '文章額度規劃中',
            features: ['進階 SEO 欄位檢查', '團隊成員權限', '禁止詞與審稿紀錄'],
            cta: { label: '登記開放通知', href: 'line' },
            highlight: true,
          },
          {
            name: '企業方案',
            audience: '適合多網站團隊',
            priceDisplay: '客製報價',
            quota: '依需求規劃',
            features: ['客製品牌資料設定', '多網站內容管理', '專人協助導入'],
            cta: { label: '預約討論', href: '/contact' },
          },
        ],
      },
      { key: 'faq', kind: 'faq', title: '常見問題', description: '關於 SEO 文章生產器的開放狀態、審稿與匯出格式。' },
      {
        key: 'cta',
        kind: 'cta',
        title: '現在就開始，讓優質內容持續累積',
        description: '留下網站與想經營的主題，客戶版開放時優先通知。',
        primary: { label: '預約討論', href: '/contact' },
        secondary: { label: 'Line@ 登記通知', href: 'line' },
        script: '好的內容，創造無限可能',
      },
    ],
  },
];

export function getProductLayout(slug: string): ProductLayout {
  const layout = productLayouts.find((item) => item.slug === slug);
  if (!layout) throw new Error(`No product layout for ${slug}`);
  return layout;
}
