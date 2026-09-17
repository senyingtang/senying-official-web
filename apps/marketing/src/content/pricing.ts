import { ACCESS_CODE_EXAMPLE } from '@syt/shared';
import type { ChipItem, Feature, IconFeature, IconName, LinkItem, TimelineStep } from './types';

/** 價格尚未確認前，所有方案一律顯示這三句，不寫任何金額 */
export const PRICING_NOTICE = ['方案整理中', '可先預約討論', '正式價格以確認報價為準'] as const;

export interface PlanPreview {
  key: string;
  name: string;
  href: string;
  summary: string;
  status: string;
  priceLabel: string;
  priceNote?: string;
  highlight?: boolean;
  features: string[];
  cta: LinkItem;
}

export const planPreviews: PlanPreview[] = [
  {
    key: 'seo-website',
    name: 'SEO 形象官網',
    href: '/products/seo-website',
    summary: '多頁式品牌官網，每頁獨立 SEO 設定。',
    status: '可自助建站',
    priceLabel: '方案整理中',
    priceNote: '規劃一次購買、月繳、年繳',
    highlight: true,
    features: ['一組代碼建立 1 個網站', '5 個基本頁面（依版型）', '表單紀錄與網站預覽', '頁面 SEO 與結構化資料'],
    cta: { label: '預約討論', href: '/contact' },
  },
  {
    key: 'landing-page',
    name: '一頁式網頁',
    href: '/products/landing-page',
    summary: '團購、活動報名、課程招生或預約表單。',
    status: '可自助建站',
    priceLabel: '方案整理中',
    priceNote: '規劃一次購買、月繳、年繳',
    features: ['一組代碼建立 1 個頁面', '報名 / 預約 / 詢問表單', '手機閱讀優先', '四種頁面類型'],
    cta: { label: '預約討論', href: '/contact' },
  },
  {
    key: 'ecommerce-website',
    name: '電商網站',
    href: '/products/ecommerce-website',
    summary: '商品、結帳流程、金流與訂單後台依需求規劃。',
    status: '客製報價',
    priceLabel: '客製報價',
    priceNote: '依商品、金流與物流需求評估',
    features: ['需求與流程訪談', '金流串接規劃', '會員與訂單後台', '依範圍分階段報價'],
    cta: { label: '預約討論', href: '/contact' },
  },
  {
    key: 'promo-page-design',
    name: '活動 DM / 宣傳頁',
    href: '/products/promo-page-design',
    summary: '社群公告圖、活動頁與印刷 DM，一套視覺多處使用。',
    status: '客製報價',
    priceLabel: '客製報價',
    priceNote: '依尺寸與交付項目報價',
    features: ['活動資訊整理', '社群圖尺寸延伸', '活動頁可加表單', '印刷檔案（依需求）'],
    cta: { label: '預約討論', href: '/contact' },
  },
  {
    key: 'seo-article-generator',
    name: 'SEO 文章生產器',
    href: '/products/seo-article-generator',
    summary: '關鍵字到文章草稿、FAQ 與多格式匯出。',
    status: '內部使用中',
    priceLabel: '開放前登記',
    priceNote: '客戶版與使用額度之後公布',
    features: ['品牌資料與禁止詞', 'H2 / H3 與 FAQ 結構', 'HTML / WordPress 格式', '人工審稿流程'],
    cta: { label: 'LINE@ 登記通知', href: 'line' },
  },
];

export const billingIntervals: Feature[] = [
  { title: '一次購買', description: '購買一次取得網站權限，適合內容固定的網站。' },
  { title: '月繳', description: '按月付費，適合想先開始、之後再決定的品牌。' },
  { title: '年繳', description: '以年為單位付費，適合長期經營的網站。' },
];

export interface PaymentMethodPreview {
  key: string;
  name: string;
  description: string;
  methods: string[];
  status: string;
}

/** 付款方式只做說明，不含任何商店代號或密鑰 */
export const paymentMethodPreviews: PaymentMethodPreview[] = [
  {
    key: 'bank_transfer',
    name: '銀行轉帳',
    description: '轉帳後填寫帳號後五碼，由客服人工對帳，確認後開通。',
    methods: ['ATM 轉帳', '網路銀行'],
    status: '預留',
  },
  {
    key: 'ecpay',
    name: '綠界 ECPay',
    description: '信用卡一次付清、ATM 虛擬帳號與網路 ATM，串接完成並通過測試後開放。',
    methods: ['信用卡', 'ATM 虛擬帳號', '網路 ATM'],
    status: '串接規劃中',
  },
  {
    key: 'linepay',
    name: 'LINE Pay',
    description: '導向 LINE Pay 完成付款，再回到森映確認訂單。',
    methods: ['LINE Pay'],
    status: '串接規劃中',
  },
];

export const checkoutNotice = {
  title: '目前尚未開放正式付款',
  description: '線上結帳與金流還在串接與測試，這個頁面不會建立訂單，也不會收取任何費用。想開始使用，請先預約討論或透過 LINE@ 聯絡。',
};

/* ---- Phase 2.6B Checkout 版型（依 mockup-checkout-page） ---- */

export const checkoutHero = {
  eyebrow: '簡單・專業・快速上線',
  title: '選擇適合你的方案，開始打造品牌網站',
  highlight: '品牌網站',
  lead: '先看方案內容與開通方式。目前尚未開放正式付款，可先預約討論，或由專人確認後人工開單。',
};

/** 方案卡的 icon 與適用對象（價格一律顯示狀態，不寫金額） */
export const planDisplay: Record<string, { icon: IconName; audience: string }> = {
  'seo-website': { icon: 'layout', audience: '適合中小企業・品牌官網' },
  'landing-page': { icon: 'file', audience: '適合活動・課程・預約' },
  'ecommerce-website': { icon: 'cart', audience: '適合品牌電商・零售' },
  'promo-page-design': { icon: 'megaphone', audience: '適合活動宣傳・檔期' },
  'seo-article-generator': { icon: 'pen', audience: '適合內容經營團隊' },
};

export const billingOptions: (ChipItem & { hint: string })[] = [
  { key: 'monthly', label: '月繳', hint: '按月付費' },
  { key: 'yearly', label: '年繳', hint: '年繳優惠整理中' },
  { key: 'once', label: '一次購買', hint: '內容固定的網站' },
];

export const BILLING_NOTE = '計費切換為外觀示意：各週期價格整理中，確認報價時一併說明。';

export const paymentMethodIcons: Record<string, IconName> = {
  bank_transfer: 'bank',
  ecpay: 'credit-card',
  linepay: 'message',
};

export const accessCodeSteps: TimelineStep[] = [
  { icon: 'check-circle', title: '完成付款', description: '送出結帳後由伺服器依資料庫價格重新開單；是否付款成功只由金流回報決定。' },
  { icon: 'mail', title: '發送權限代碼', description: `以 Email 寄送專屬代碼，例如 ${ACCESS_CODE_EXAMPLE}。` },
  { icon: 'key', title: '立即啟用', description: '登入客戶後台輸入代碼，建立工作區後開始建站。' },
];

export const checkoutTrust: IconFeature[] = [
  { icon: 'lock', title: '本站不收卡號與 CVV', description: '這裡只收姓名與聯絡方式；正式金流開放後，卡號等資料只會在金流商頁面填寫。' },
  { icon: 'check-circle', title: '金額由伺服器重新計算', description: '訂單金額一律以資料庫價格重算，瀏覽器送來的金額不會被採用，也不會自動扣款。' },
  { icon: 'headset', title: '專人協助', description: '方案、開通或發票問題，可以透過 LINE@ 或聯絡表單詢問。' },
];

export const checkoutFinalCta = {
  title: '準備好讓你的品牌網站上線了嗎？',
  description: '現在先預約討論，確認方案內容後由專人協助開通。',
  primary: { label: '預約討論', href: '/contact' } satisfies LinkItem,
  secondary: { label: 'LINE@ 詢問', href: 'line' } satisfies LinkItem,
};

export const redeemSteps: Feature[] = [
  { title: '確認方案與付款', description: '正式付款開放前，由客服協助確認方案內容。' },
  { title: '系統產生權限代碼', description: `付款確認後自動產生一組代碼，例如 ${ACCESS_CODE_EXAMPLE}。` },
  { title: '登入客戶後台兌換', description: '兌換後建立工作區；代碼兌換前可以轉讓給實際使用的人。' },
  { title: '選版型開始建站', description: '填內容、預覽畫面，確認後再發布。' },
];
