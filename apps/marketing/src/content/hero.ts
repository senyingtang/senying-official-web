import { ACCESS_CODE_EXAMPLE, BRAND } from '@syt/shared';
import type { Feature } from './types';

export interface HeroLink {
  label: string;
  href: string;
  /** data-cta 標記 */
  cta: string;
}

export const hero = {
  eyebrow: BRAND.platformName,
  title: BRAND.tagline,
  lead: '從 SEO 官網、一頁式頁面到文章生產器，把接案經驗整理成可購買、可開通、可持續管理的數位產品。',
  primaryCta: { label: '查看產品方案', href: '/products' },
  secondaryCta: { label: '預約討論', href: '/contact' },
  links: [
    { label: '進入客戶後台', href: 'portal', cta: 'hero-portal' },
    { label: '看版型方向', href: '#templates', cta: 'hero-templates' },
  ] satisfies HeroLink[],
  trust: [
    { title: '每頁獨立 SEO 欄位', description: '標題、描述、FAQ 與結構化資料' },
    { title: '權限代碼開通', description: '付款確認後自動產生，兌換即可建站' },
    { title: '手機優先版面', description: '六種螢幕寬度逐頁檢查' },
    { title: '可自助，也能客製', description: '電商與特殊流程先討論再報價' },
  ] satisfies Feature[],
  visualNote: '畫面為產品操作示意，不是真實客戶資料。',
};

/** 產品事實（不是成效數字） */
export const homeStats = [
  { value: '5', label: '條產品線', description: '官網、一頁式、電商、宣傳設計、文章' },
  { value: '3', label: '個步驟開始建站', description: '取得代碼、選版型、填內容' },
  { value: '4', label: '種一頁式頁型', description: '團購、報名、招生、預約' },
  { value: '6', label: '種螢幕寬度檢查', description: '375px 到 1440px' },
];

export type HighlightIcon = 'seo' | 'edit' | 'code' | 'preview';

export const homeHighlights: (Feature & { icon: HighlightIcon })[] = [
  { icon: 'seo', title: 'SEO 欄位做在版型裡', description: '每一頁都能設定標題、描述、Canonical、FAQ 與結構化資料，不必上線後才補。' },
  { icon: 'edit', title: '內容自己更新', description: '文字、圖片、FAQ 與表單紀錄都在客戶後台，改一段文字不用等工程師排時間。' },
  { icon: 'code', title: '權限代碼開通', description: '付款確認後系統產生代碼，兌換就能建立工作區；兌換前也可以轉讓給實際使用的人。' },
  { icon: 'preview', title: '先預覽，再發布', description: '修改先存成草稿，確認手機、平板與桌機畫面後再發布。' },
];

export const quickSteps: Feature[] = [
  { title: '選方案，取得權限代碼', description: `確認方案並付款後，系統自動產生一組代碼，例如 ${ACCESS_CODE_EXAMPLE}。` },
  { title: '兌換代碼，選一套版型', description: '登入客戶後台輸入代碼，建立工作區後挑選適合的版型。' },
  { title: '填內容，預覽後發布', description: '依欄位填入文字、圖片與 SEO 設定，確認各尺寸畫面後發布。' },
];

export const whyNotJustPretty = {
  eyebrow: '為什麼不是只做漂亮網站',
  title: '網站好看只是開始，上線後好不好用才是重點',
  description: '我們在意的是網站交出去之後，品牌能不能自己維護，客人能不能順利找到你、聯絡你。',
  rows: [
    { topic: '上線之後', pretty: '改一段文字要再找設計師或工程師', ours: '文字、圖片與 FAQ 在後台自己更新' },
    { topic: '搜尋曝光', pretty: 'SEO 設定常被放到最後才補', ours: '每頁 SEO 欄位與結構化資料在版型裡就有' },
    { topic: '詢問與報名', pretty: '表單寄到信箱，容易漏看', ours: '表單紀錄集中在後台，可以標記處理狀態' },
    { topic: '手機畫面', pretty: '桌機好看，手機打開才發現跑版', ours: '版型以手機優先，六種寬度逐頁檢查' },
    { topic: '內容經營', pretty: '網站做完就停在那裡', ours: '搭配文章生產器規劃 SEO 內容' },
    { topic: '需求變多', pretty: '要加功能只能整個重做', ours: '從一頁式到官網、電商可以逐步升級' },
  ],
};
