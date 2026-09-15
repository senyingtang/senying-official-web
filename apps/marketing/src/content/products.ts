import type { FaqItem } from '@syt/seo';
import type { ProductCode } from '@syt/shared';
import type { CtaContent, Feature, LinkItem, MockVisual, ShowcaseItem } from './types';

export type { CtaContent, Feature, LinkItem, MockVisual, ShowcaseItem } from './types';

export type Availability = 'self_serve' | 'quote' | 'internal_beta';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  self_serve: '第一版可自助建站',
  quote: '客製報價',
  internal_beta: '內部使用中',
};

export type ProductCategory = 'website' | 'content' | 'design' | 'custom';

export const PRODUCT_CATEGORIES: { key: ProductCategory; label: string; description: string }[] = [
  { key: 'website', label: '網站產品', description: '品牌官網、一頁式頁面與電商網站，依目的選擇頁面規模。' },
  { key: 'content', label: '內容產品', description: '網站上線後，用結構一致的文章持續累積搜尋內容。' },
  { key: 'design', label: '設計產品', description: '活動與宣傳需要的頁面、社群圖與印刷檔案。' },
  { key: 'custom', label: '客製服務', description: '版型無法涵蓋的流程、系統，或既有網站的翻新。' },
];

export interface DetailSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: Feature[];
  layout: 'grid' | 'list' | 'flow';
}

export interface GalleryItem {
  label: string;
  format: string;
  description: string;
  visual: MockVisual;
}

export interface ProductPage {
  slug: string;
  path: string;
  productCode: ProductCode;
  name: string;
  eyebrow: string;
  category: ProductCategory;
  visual: MockVisual;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  lead: string;
  cardSummary: string;
  availability: Availability;
  tags: string[];
  audience: string[];
  features: Feature[];
  detailSections: DetailSection[];
  gallery?: GalleryItem[];
  deliverables: string[];
  steps: Feature[];
  pricingNote: string;
  faq: FaqItem[];
  cta: CtaContent & { secondary: LinkItem };
  related: string[];
  schemaType: 'Service' | 'SoftwareApplication';
}

const selfServeCta = {
  title: '選好方案，就能開始建站',
  description: '方案整理中，可以先預約討論需求；購買後會收到權限代碼，兌換就能開始選版型。',
  primary: { label: '查看方案與開通流程', href: '/checkout' },
  secondary: { label: '預約討論', href: '/contact' },
};

const quoteCta = {
  title: '先聊需求，再決定怎麼做',
  description: '把商品、流程與預算範圍告訴我們，會先整理可行做法與報價方向。',
  primary: { label: '預約討論', href: '/contact' },
  secondary: { label: 'LINE@ 詢問', href: 'line' },
};

export const products: ProductPage[] = [
  {
    slug: 'seo-website',
    path: '/products/seo-website',
    productCode: 'SEO',
    name: 'SEO 形象官網',
    eyebrow: '網站產品 · 多頁式品牌官網',
    category: 'website',
    visual: 'website',
    seoTitle: 'SEO 形象官網｜模板建站、後台自行更新內容',
    seoDescription: '選版型、填入品牌資料，就能建立有完整 SEO 設定的形象官網。頁面標題、描述、FAQ 與結構化資料都能在後台調整。',
    h1: 'SEO 形象官網，上線後也能自己更新內容',
    lead: '選一套版型、填入品牌資料，就能產生首頁、關於、服務與聯絡頁。每一頁的標題、描述、FAQ 和結構化資料都在後台設定，改文字不必再找工程師。',
    cardSummary: '首頁、服務、關於與聯絡頁一次到位，每頁都有獨立 SEO 設定。',
    availability: 'self_serve',
    tags: ['每頁 SEO 欄位', 'CMS 後台', '表單紀錄'],
    audience: ['在地店家、工作室與診所', '服務型公司需要清楚介紹服務項目', '已有網站但內容很難更新的品牌', '想開始經營搜尋流量的新品牌'],
    features: [
      { title: '多頁式版型', description: '首頁、關於我們、服務項目、聯絡我們與隱私權頁，頁面結構依搜尋需求規劃。' },
      { title: '每頁獨立 SEO 欄位', description: 'SEO 標題、描述、Canonical、OG 圖片與 H1 都能分頁設定。' },
      { title: 'FAQ 與結構化資料', description: '填寫常見問題後，自動輸出 FAQPage 結構化資料。' },
      { title: '聯絡表單紀錄', description: '訪客送出的表單保存在後台，可以標記處理狀態。' },
      { title: '手機優先的版面', description: '版型在手機、平板與桌機都經過排版檢查。' },
      { title: '先預覽，再發布', description: '內容修改先存成草稿，確認預覽畫面後再發布。' },
    ],
    detailSections: [
      {
        id: 'seo-basics',
        eyebrow: 'SEO 基礎',
        title: 'SEO 設定放在版型裡，不是上線後才補',
        description: '每一頁都有獨立欄位，搜尋引擎需要的資訊在建站時就填好。',
        layout: 'grid',
        items: [
          { title: 'SEO 標題與描述', description: '依頁面分別設定，後台顯示建議字數。' },
          { title: 'Canonical 與 OG 圖片', description: '避免重複網址，分享到社群時顯示正確標題與圖片。' },
          { title: 'H1 與段落結構', description: '版型已規劃標題層級，填內容時不必擔心結構亂掉。' },
          { title: 'FAQ 結構化資料', description: '填寫常見問題後自動輸出 FAQPage。' },
          { title: 'sitemap 與 robots', description: '發布後自動更新網站地圖；正式上線前預設不被收錄。' },
          { title: '麵包屑', description: '頁面階層清楚，也同步輸出 BreadcrumbList。' },
        ],
      },
      {
        id: 'cms',
        eyebrow: 'CMS / 後台管理',
        title: '內容自己改，改完先預覽',
        description: '文字、圖片、FAQ 與表單紀錄都在客戶後台，一般更新不用再找工程師。',
        layout: 'list',
        items: [
          { title: '內容欄位', description: '依版型區塊填寫文字、圖片與按鈕連結。' },
          { title: '草稿與預覽', description: '修改先存草稿，確認手機與桌機畫面再發布。' },
          { title: '表單紀錄', description: '訪客送出的詢問集中保存，可以標記處理狀態。' },
          { title: '工作區成員', description: '可以邀請成員一起管理網站，權限依方案開放。' },
        ],
      },
      {
        id: 'upgrades',
        eyebrow: '可升級項目',
        title: '先上線，之後再加',
        description: '網站需求會隨品牌成長改變，以下項目可以在需要時再討論。',
        layout: 'grid',
        items: [
          { title: '自訂網域與 SSL', description: '後台提供 DNS 設定教學，依版本逐步開放。' },
          { title: 'SEO 文章經營', description: '搭配 SEO 文章生產器規劃內容主題。' },
          { title: '付費與私人版型', description: '版型商店開放後，可以更換成其他版面。' },
          { title: '客製功能', description: '預約、會員或串接其他系統，另外客製報價。' },
        ],
      },
    ],
    deliverables: ['5 個基本頁面（依版型）', '頁面 SEO 與結構化資料設定', '聯絡表單與表單紀錄', '網站預覽連結', 'DNS 設定教學（自訂網域開放後）'],
    steps: [
      { title: '確認方案', description: '付款確認後收到一組 SYT-SEO 開頭的權限代碼。' },
      { title: '兌換代碼', description: '登入客戶後台輸入代碼，系統建立你的工作區。' },
      { title: '選版型、填內容', description: '依欄位填寫文字與圖片，不需要自己排版。' },
      { title: '預覽並發布', description: '確認手機與桌機畫面後發布。' },
    ],
    pricingNote: '方案整理中，規劃一次購買、月繳與年繳。可先預約討論，正式價格以確認報價為準。',
    faq: [
      { question: '需要會寫程式或設計嗎？', answer: '不需要。版型已經排好版面，你只要依欄位填入文字、圖片與聯絡資訊。' },
      { question: '一組權限代碼可以做幾個網站？', answer: '第一版每組權限代碼可以建立 1 個網站。需要多個網站時，可以購買多組代碼。' },
      { question: '可以使用自己的網域嗎？', answer: '自訂網域設定會在後續版本開放，後台會提供 DNS 設定教學。現階段可以先由森映協助設定。' },
      { question: 'SEO 設定包含哪些項目？', answer: '每頁的 SEO 標題、描述、Canonical、OG 圖片、H1、FAQ 與結構化資料，另有 sitemap 與 robots 設定。' },
    ],
    cta: selfServeCta,
    related: ['landing-page', 'seo-article-generator'],
    schemaType: 'Service',
  },
  {
    slug: 'landing-page',
    path: '/products/landing-page',
    productCode: 'LP',
    name: '一頁式網頁',
    eyebrow: '網站產品 · 活動、課程、預約',
    category: 'website',
    visual: 'landing',
    seoTitle: '一頁式網頁｜團購、活動報名、課程招生與預約頁',
    seoDescription: '用一個頁面說清楚活動、課程或優惠，搭配報名與預約表單。提供團購促銷、活動報名、課程招生與預約表單四種版型方向。',
    h1: '一頁式網頁，把活動、課程或優惠說清楚',
    lead: '訪客從上往下滑，就能看懂內容、確認細節並直接留下資料。適合短期活動、單一課程或單一服務，不需要整個官網也能開始接單。',
    cardSummary: '團購促銷、活動報名、課程招生、預約表單，一頁完成說明與轉換。',
    availability: 'self_serve',
    tags: ['團購促銷', '活動報名', '課程招生', '預約表單'],
    audience: ['舉辦講座、市集或活動的主辦單位', '開設課程或工作坊的講師', '需要收預約的美業、健身與顧問服務', '短期檔期或團購優惠'],
    features: [
      { title: '固定轉換結構', description: '主視覺、重點說明、見證、FAQ 與表單依閱讀順序排好。' },
      { title: '表單直接收資料', description: '報名、預約或詢問資料保存在後台，方便整理。' },
      { title: '手機閱讀優先', description: '一頁式網頁多數來自社群連結，版面以手機為主設計。' },
      { title: '檔期結束可封存', description: '活動結束後保留資料，頁面可以下架或換新內容。' },
    ],
    detailSections: [
      {
        id: 'conversion',
        eyebrow: '轉換導向版面',
        title: '版面順序照著「看懂、相信、行動」排列',
        description: '一頁式網頁的訪客多半從社群或廣告進來，停留時間短，重點要一路往下說清楚。',
        layout: 'flow',
        items: [
          { title: '第一屏說清楚', description: '主標、優惠或活動時間與主要按鈕，第一眼就看得到。' },
          { title: '重點與細節', description: '方案內容、流程與注意事項，用小標分段。' },
          { title: '信任資訊', description: '講師介紹、店家資訊或取得同意的心得。' },
          { title: '按鈕重複出現', description: '中段與底部都放行動按鈕，不必滑回頂部。' },
        ],
      },
      {
        id: 'fast-launch',
        eyebrow: '快速上線',
        title: '有內容就能開始，不必等整個官網',
        description: '一頁式網頁只需要準備一件事的資訊，適合檔期緊的活動與課程。',
        layout: 'grid',
        items: [
          { title: '版型已排好', description: '選頁面類型後填欄位，不需要設計排版。' },
          { title: '表單欄位可調', description: '姓名、電話、人數、希望時段等常用欄位。' },
          { title: '手機先檢查', description: '預覽時先看手機畫面，再看桌機。' },
          { title: '檔期結束可封存', description: '保留報名資料，頁面可以下架或換成下一檔內容。' },
        ],
      },
    ],
    deliverables: ['一頁式版型', '報名 / 預約 / 詢問表單', '表單紀錄後台', '頁面 SEO 與分享圖片設定', '網站預覽連結'],
    steps: [
      { title: '選擇頁面類型', description: '團購促銷、活動報名、課程招生或預約表單。' },
      { title: '填入內容', description: '活動資訊、課程大綱、方案與常見問題。' },
      { title: '設定表單', description: '決定要收集的欄位，例如姓名、電話、人數。' },
      { title: '預覽並發布', description: '用手機檢查一次，再發布到網路上。' },
    ],
    pricingNote: '方案整理中，第一版每組權限代碼可建立 1 個一頁式網頁。可先預約討論，正式價格以確認報價為準。',
    faq: [
      { question: '一頁式網頁和官網有什麼不同？', answer: '一頁式網頁只講一件事，例如一場活動或一門課程，目標是讓訪客直接報名或詢問；官網則介紹整個品牌與多項服務。' },
      { question: '表單資料會存在哪裡？', answer: '表單送出後會保存在客戶後台的表單紀錄，只有你的工作區成員看得到。' },
      { question: '可以放付款按鈕嗎？', answer: '第一版以報名與詢問表單為主，線上付款會在金流功能開放後提供。' },
      { question: '活動結束後頁面怎麼處理？', answer: '可以把頁面改為封存，或更新成下一檔活動的內容。' },
    ],
    cta: selfServeCta,
    related: ['seo-website', 'promo-page-design'],
    schemaType: 'Service',
  },
  {
    slug: 'ecommerce-website',
    path: '/products/ecommerce-website',
    productCode: 'ECOM',
    name: '電商網站',
    eyebrow: '網站產品 · 客製報價',
    category: 'website',
    visual: 'ecommerce',
    seoTitle: '電商網站建置｜商品展示、結帳流程與金流規劃',
    seoDescription: '電商網站需要依商品、物流、金流與會員需求規劃。先整理商品展示、結帳流程、金流預留與訂單後台，再提供客製報價。',
    h1: '電商網站，先把商品、金流和訂單流程談清楚',
    lead: '每個品牌的商品規格、出貨方式與優惠規則都不同，所以電商網站第一版採客製報價。我們會先整理流程，再決定需要哪些功能。',
    cardSummary: '商品展示、結帳流程、金流預留與訂單後台，依需求規劃後報價。',
    availability: 'quote',
    tags: ['商品展示', '結帳流程', '金流預留', '訂單後台'],
    audience: ['準備開始線上銷售的品牌', '從社群接單想改成網站下單', '想建立自己的官網商店', '需要訂閱制或預購流程的商品'],
    features: [
      { title: '商品與規格管理', description: '商品、分類、規格、庫存與上下架狀態。' },
      { title: '購物與結帳流程', description: '購物車、優惠碼、運送方式與付款方式。' },
      { title: '金流串接規劃', description: '綠界信用卡、ATM、LINE Pay 與銀行轉帳的串接與對帳流程。' },
      { title: '訂單與出貨後台', description: '訂單狀態、出貨紀錄、退款與通知信。' },
    ],
    detailSections: [
      {
        id: 'commerce-flow',
        eyebrow: '購物流程',
        title: '從商品頁到訂單，流程先畫清楚',
        description: '電商網站最常出問題的地方在流程細節，所以第一版先整理流程，再決定功能範圍。',
        layout: 'flow',
        items: [
          { title: '商品展示', description: '商品分類、規格、圖片與庫存狀態，手機上也好瀏覽。' },
          { title: '結帳流程', description: '購物車、運送方式、優惠碼與訂購人資料。' },
          { title: '金流預留', description: '規劃綠界、LINE Pay 與銀行轉帳，實際開通依金流商審核。' },
          { title: '會員與訂單', description: '會員資料、歷史訂單與訂單狀態通知。' },
          { title: '後台管理', description: '訂單處理、出貨紀錄、退款與商品上下架。' },
        ],
      },
      {
        id: 'custom-fit',
        eyebrow: '適合客製討論',
        title: '這些情況建議先談',
        description: '商品規則越特別，越需要在報價前確認流程。',
        layout: 'grid',
        items: [
          { title: '多規格或組合商品', description: '尺寸、顏色、加購與組合價格。' },
          { title: '預購與訂閱', description: '分批出貨、定期配送或會員方案。' },
          { title: '門市與線上並行', description: '庫存同步、門市取貨或預約到店。' },
          { title: '既有系統串接', description: 'ERP、物流或會員資料轉移。' },
        ],
      },
    ],
    deliverables: ['需求與流程整理', '功能範圍與報價', '商品 / 訂單後台', '金流測試環境驗收', 'SEO 基礎設定'],
    steps: [
      { title: '需求訪談', description: '商品數量、規格、物流與金流需求。' },
      { title: '流程與範圍確認', description: '列出第一版必要功能與後續擴充項目。' },
      { title: '報價與時程', description: '依功能範圍提供報價與分階段時程。' },
      { title: '開發與驗收', description: '在測試環境完成付款與訂單流程驗收。' },
    ],
    pricingNote: '依商品數量、金流與物流需求評估，提供客製報價。可先預約討論，正式價格以確認報價為準。',
    faq: [
      { question: '電商網站可以自己用後台建立嗎？', answer: '第一版電商網站採客製建置，因為金流、物流與商品規格差異大，需要先確認流程。' },
      { question: '規劃支援哪些付款方式？', answer: '規劃支援綠界信用卡、ATM 虛擬帳號、LINE Pay 與銀行轉帳，實際開通依金流商審核。' },
      { question: '需要自己申請金流嗎？', answer: '需要以你的公司或商號向金流商申請，我們會協助準備串接所需的資料與測試。' },
      { question: '報價需要多久？', answer: '收到需求資料後，會先整理功能範圍，再提供報價與時程。' },
    ],
    cta: quoteCta,
    related: ['seo-website', 'landing-page'],
    schemaType: 'Service',
  },
  {
    slug: 'promo-page-design',
    path: '/products/promo-page-design',
    productCode: 'DM',
    name: '活動 DM / 宣傳頁面設計',
    eyebrow: '設計產品 · 社群、網頁與印刷',
    category: 'design',
    visual: 'promo',
    seoTitle: '活動 DM 與宣傳頁面設計｜社群圖、活動頁與印刷版本',
    seoDescription: '活動 DM、宣傳頁與社群公告圖設計，同一套視覺延伸到網頁、社群貼文與印刷 DM，並搭配報名按鈕或 LINE@ 導流。',
    h1: '活動 DM 與宣傳頁面設計，網路和印刷都能用',
    lead: '同一場活動常常需要社群圖、活動頁和紙本 DM。先整理活動資訊與視覺方向，再延伸成不同尺寸，資訊不會東一版西一版。',
    cardSummary: '社群公告圖、活動頁與印刷 DM，一套視覺多處使用。',
    availability: 'quote',
    tags: ['社群公告圖', '活動頁', '宣傳頁', 'LINE@ 搭配'],
    audience: ['店家節慶檔期與開幕活動', '講座、展覽與市集宣傳', '課程或招生需要實體傳單', '需要快速上線的活動宣傳頁'],
    features: [
      { title: '活動資訊整理', description: '時間、地點、報名方式與注意事項，整理成清楚的閱讀順序。' },
      { title: '宣傳頁面', description: '可以搭配一頁式網頁版型，加入報名表單。' },
      { title: '社群圖片尺寸', description: '依常用社群版位輸出圖片。' },
      { title: '印刷檔案', description: '依印刷需求輸出含出血的檔案。' },
    ],
    gallery: [
      { label: '社群公告圖', format: '1:1 / 4:5', description: '活動主視覺與重點資訊，縮小看也讀得到。', visual: 'promo' },
      { label: '限時動態', format: '9:16', description: '倒數提醒與報名入口。', visual: 'promo' },
      { label: '活動宣傳頁', format: '手機優先網頁', description: '活動資訊、流程與報名表單。', visual: 'landing' },
      { label: '印刷 DM', format: 'A5 / A4', description: '依印刷需求輸出，含出血設定。', visual: 'promo' },
    ],
    detailSections: [
      {
        id: 'channels',
        eyebrow: '交付內容',
        title: '同一套視覺，延伸到每個宣傳管道',
        description: '活動資訊只整理一次，網頁、社群與紙本上的時間、地點和報名方式都一致。',
        layout: 'grid',
        items: [
          { title: '社群公告圖', description: '依常用版位輸出，資訊層級清楚，手機上縮小看也讀得到。' },
          { title: '活動頁', description: '可以搭配一頁式網頁版型，加入報名或預約表單。' },
          { title: '宣傳頁 / DM', description: '印刷用檔案依需求加上出血與色彩設定。' },
          { title: '轉換 CTA', description: '每個版本都放清楚的下一步：報名、預約或加入 LINE@。' },
        ],
      },
      {
        id: 'line-combo',
        eyebrow: '搭配網站或 LINE@',
        title: '宣傳不只是一張圖',
        description: '社群圖負責被看見，網頁負責說清楚，LINE@ 負責後續聯繫。',
        layout: 'flow',
        items: [
          { title: '社群圖導到活動頁', description: '貼文放短連結，完整資訊放在頁面上。' },
          { title: '活動頁導到 LINE@', description: '報名後加入官方帳號，方便通知與提醒。' },
          { title: '官網放活動入口', description: '既有官網可以加上活動橫幅或最新消息。' },
        ],
      },
    ],
    deliverables: ['活動資訊文案整理', '宣傳頁面或 DM 視覺', '社群圖片尺寸延伸', '印刷檔案（依需求）'],
    steps: [
      { title: '提供活動資料', description: '活動內容、素材與希望的風格。' },
      { title: '確認視覺方向', description: '先確認主視覺，再延伸其他尺寸。' },
      { title: '修改與定稿', description: '依回饋調整內容與版面。' },
      { title: '交付檔案', description: '活動頁上線，或提供印刷、社群用檔案。' },
    ],
    pricingNote: '依頁面數量、尺寸與交付項目報價。可先預約討論，正式價格以確認報價為準。',
    faq: [
      { question: '只做紙本 DM 可以嗎？', answer: '可以，也可以只做宣傳頁面或社群圖片，依需要的項目報價。' },
      { question: '需要自己準備照片嗎？', answer: '建議提供活動或商品照片；沒有素材時可以討論使用授權圖庫或插圖。' },
      { question: '可以搭配報名表單嗎？', answer: '可以搭配一頁式網頁版型，把報名表單放在宣傳頁中。' },
      { question: '修改次數怎麼算？', answer: '報價時會先說明包含的修改次數與範圍。' },
    ],
    cta: quoteCta,
    related: ['landing-page', 'seo-website'],
    schemaType: 'Service',
  },
  {
    slug: 'seo-article-generator',
    path: '/products/seo-article-generator',
    productCode: 'AI',
    name: 'SEO 文章生產器',
    eyebrow: '內容產品 · 內部工具',
    category: 'content',
    visual: 'article',
    seoTitle: 'SEO 文章生產器｜SEO 標題、H2/H3、FAQ Schema 與匯出',
    seoDescription: '輸入品牌資料、關鍵字與語氣，產生含 SEO title、meta description、H2/H3、FAQ 與 FAQ Schema 的文章草稿，可匯出 HTML 與 WordPress 格式。',
    h1: 'SEO 文章生產器，從關鍵字到可以審稿的文章草稿',
    lead: '目前是森映內部使用的工具。把品牌資料、目標關鍵字和語氣設定好，就能產生結構完整的文章草稿；草稿一定經過人工審稿才發布。',
    cardSummary: '品牌資料、關鍵字與語氣設定，產出含 FAQ Schema 的文章草稿。',
    availability: 'internal_beta',
    tags: ['內部工具', 'FAQ Schema', 'WordPress 格式'],
    audience: ['需要固定產出文章的品牌網站', '經營在地搜尋的服務業', '有內容規劃但人力不足的團隊', '需要 WordPress 或 HTML 格式的內容'],
    features: [
      { title: '品牌資料與禁止詞', description: '設定品牌事實、語氣與不想出現的用語，生成時一併檢查。' },
      { title: '關鍵字與地區', description: '主要關鍵字、次要關鍵字、搜尋意圖與地區。' },
      { title: '完整文章結構', description: 'SEO 標題、描述、H1、H2/H3、FAQ 與 FAQ 結構化資料。' },
      { title: '多種匯出格式', description: 'Markdown、HTML、WordPress HTML 與 JSON-LD。' },
      { title: '審核流程', description: '草稿、審核、核准、發布，每次變更都有紀錄。' },
      { title: '使用額度', description: '開放後依方案設定可生成的文章數量。' },
    ],
    detailSections: [
      {
        id: 'status',
        eyebrow: '目前狀態',
        title: '目前是森映內部工具，之後依方案開放權限',
        description: '先在森映自己的網站與專案中使用，流程穩定後再開放客戶權限與使用額度。',
        layout: 'list',
        items: [
          { title: '內部使用中', description: '用於森映官網與合作專案的文章草稿。' },
          { title: '權限規劃', description: '之後以權限代碼或訂閱方案開放，依額度使用。' },
          { title: '開放通知', description: '可以先登記，開放時優先通知。' },
        ],
      },
      {
        id: 'outputs',
        eyebrow: '輸出內容',
        title: '一篇草稿，包含這些 SEO 欄位',
        description: '產出的不是一段文字，而是可以放進網站的結構化內容。',
        layout: 'grid',
        items: [
          { title: 'SEO title', description: '依關鍵字與建議字數產生頁面標題。' },
          { title: 'meta description', description: '搜尋結果下方看到的摘要說明。' },
          { title: 'H2 / H3 結構', description: '依搜尋意圖安排段落標題。' },
          { title: 'FAQ', description: '整理讀者常問的問題與回答。' },
          { title: 'FAQ Schema', description: '輸出 FAQPage JSON-LD 結構化資料。' },
          { title: 'HTML', description: '可以直接貼進網站編輯器。' },
          { title: 'WordPress 上稿格式', description: '相容 WordPress 區塊編輯器的 HTML。' },
          { title: 'Markdown', description: '方便版本管理，也能用在其他 CMS。' },
        ],
      },
      {
        id: 'review',
        eyebrow: '人工審稿提醒',
        title: '草稿要經過人工確認才發布',
        description: '系統會檢查結構與禁止詞，但品牌事實、價格與專業內容仍要由人確認。',
        layout: 'list',
        items: [
          { title: '禁止詞標示', description: '品牌不想出現的用語會被標出來。' },
          { title: '事實確認', description: '服務內容、價格與地點，以品牌提供的資料為準。' },
          { title: '審核紀錄', description: '草稿、審核、核准與發布都留有紀錄。' },
        ],
      },
    ],
    deliverables: ['品牌資料設定', '關鍵字清單管理', '文章草稿與版本', '多格式匯出', '審核與使用紀錄'],
    steps: [
      { title: '建立品牌資料', description: '品牌介紹、服務項目、語氣與禁止詞。' },
      { title: '整理關鍵字', description: '依主題與優先度排列要寫的文章。' },
      { title: '產生草稿', description: '系統產生文章結構與內容草稿。' },
      { title: '人工審稿後匯出', description: '修改確認後，匯出或發布到網站。' },
    ],
    pricingNote: '目前為森映內部使用，客戶版與使用額度方案之後公布。可先預約討論，正式價格以確認報價為準。',
    faq: [
      { question: '現在可以購買使用嗎？', answer: '目前是森映內部使用與測試階段，客戶版開放時會在這個頁面公告。' },
      { question: '產生的文章可以直接發布嗎？', answer: '不建議。系統會產生草稿並檢查禁止詞與結構，發布前仍需要人工確認內容正確。' },
      { question: '支援哪些匯出格式？', answer: 'HTML、WordPress 上稿格式、Markdown 與 FAQ Schema（JSON-LD）。' },
      { question: '可以設定不想出現的詞嗎？', answer: '可以，在品牌資料設定禁止詞，生成後會標示命中的詞。' },
      { question: '使用文章生產器會保證搜尋排名嗎？', answer: '不會。工具協助整理文章結構與 SEO 欄位，排名受網站整體內容、競爭程度與搜尋引擎演算法影響，無法保證。' },
    ],
    cta: {
      title: '想先了解文章生產流程？',
      description: '留下網站與想經營的主題，客戶版開放時優先通知。',
      primary: { label: '預約討論', href: '/contact' },
      secondary: { label: 'LINE@ 登記通知', href: 'line' },
    },
    related: ['seo-website', 'landing-page'],
    schemaType: 'SoftwareApplication',
  },
];

export interface CustomService {
  name: string;
  summary: string;
  points: string[];
  href: string;
}

export const customServices: CustomService[] = [
  { name: '網站客製功能', summary: '預約、會員、報名名額或串接既有系統，版型無法涵蓋時的客製開發。', points: ['需求訪談', '功能範圍與報價', '分階段上線'], href: '/contact' },
  { name: 'App MVP 與後台系統', summary: '把重複的人工流程整理成可以操作的系統，先做最小可用版本驗證。', points: ['流程盤點', 'MVP 規劃', '後台管理'], href: '/contact' },
  { name: '既有網站翻新', summary: '舊網站內容難更新或手機版跑版，先盤點內容與網址，再規劃搬移。', points: ['內容盤點', '網址轉址規劃', 'SEO 設定檢查'], href: '/contact' },
];

export const productChooser: { goal: string; product: string; href: string; reason: string }[] = [
  { goal: '想讓客人了解品牌與服務', product: 'SEO 形象官網', href: '/products/seo-website', reason: '多頁介紹服務與品牌，每頁都能設定 SEO。' },
  { goal: '有一檔活動、課程或優惠要推', product: '一頁式網頁', href: '/products/landing-page', reason: '一頁說清楚，直接收報名或預約。' },
  { goal: '要在網站上賣商品', product: '電商網站', href: '/products/ecommerce-website', reason: '商品、結帳與訂單流程先談清楚再報價。' },
  { goal: '活動需要社群圖和印刷 DM', product: '活動 DM / 宣傳頁', href: '/products/promo-page-design', reason: '一套視覺延伸到社群、網頁與紙本。' },
  { goal: '網站上線了，想持續累積內容', product: 'SEO 文章生產器', href: '/products/seo-article-generator', reason: '結構一致的文章草稿，人工審稿後發布。' },
  { goal: '需要特殊流程或系統', product: '客製服務', href: '/contact', reason: '先盤點流程，再決定範圍與分階段做法。' },
];

export function getProduct(slug: string): ProductPage {
  const product = products.find((item) => item.slug === slug);
  if (!product) throw new Error(`Unknown product: ${slug}`);
  return product;
}

export function toShowcaseItem(product: ProductPage): ShowcaseItem {
  return {
    name: product.name,
    summary: product.cardSummary,
    href: product.path,
    badge: AVAILABILITY_LABELS[product.availability],
    category: PRODUCT_CATEGORIES.find((category) => category.key === product.category)?.label,
    tags: product.tags,
    visual: product.visual,
  };
}
