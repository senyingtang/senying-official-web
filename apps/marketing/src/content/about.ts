import type { Feature, LinkItem } from './types';

export const aboutComparison = {
  agency: {
    title: '一般接案',
    items: ['每個案子從零開始報價與規劃', '上線後改內容要再找人處理', 'SEO 設定看個人經驗，常被省略', '網站交付後很難持續累積'],
  },
  ours: {
    title: '森映的做法',
    items: ['常見需求整理成固定的產品與版型', '內容與 SEO 欄位放在後台自己改', '每一頁都有一致的 SEO 設定', '上線後可以搭配文章持續經營'],
  },
};

export const workModes: { tag: string; title: string; description: string; points: string[]; cta: LinkItem }[] = [
  {
    tag: '自助建站',
    title: '選方案、兌換代碼、自己填內容',
    description: '需求明確、版型可以涵蓋時，自助建站最省時間，費用也比較好掌握。',
    points: ['SEO 形象官網與一頁式網頁', '權限代碼開通，兌換前可以轉讓', '內容與 SEO 在後台自己更新'],
    cta: { label: '查看產品方案', href: '/products' },
  },
  {
    tag: '客製服務',
    title: '流程特別的需求，先談再做',
    description: '電商、會員、預約系統或既有網站翻新，先整理流程與範圍，再提供報價。',
    points: ['需求訪談與流程整理', '功能範圍與分階段報價', '上線後仍可接回森映後台管理'],
    cta: { label: '預約討論', href: '/contact' },
  },
];

export const humanHelp: (Feature & { link: LinkItem })[] = [
  { title: 'LINE@ 詢問', description: '方案內容、報價與開通問題，直接傳訊息詢問。', link: { label: '開啟 LINE@', href: 'line' } },
  { title: '預約討論', description: '還不確定要做什麼時，先把狀況說清楚，一起整理下一步。', link: { label: '填寫需求', href: '/contact' } },
  { title: '建站過程協助', description: '兌換代碼、網域設定或內容填寫卡住時，可以找人幫忙。', link: { label: '進入客戶後台', href: 'portal' } },
];

export const principles: Feature[] = [
  { title: '先講清楚要解決什麼', description: '做網站之前，先確認訪客是誰、要完成什麼事，再決定頁面與功能。' },
  { title: '內容要能自己更新', description: '文字、圖片、FAQ 與 SEO 設定放在後台，改內容不必每次都找工程師。' },
  { title: '只放能驗證的資訊', description: '案例與成效只呈現確認過的內容，不用誇大的數字包裝。' },
  { title: '手機畫面優先', description: '多數訪客用手機瀏覽，每個版型都先確認手機版面。' },
];

export const platformStages: { stage: string; title: string; items: string[] }[] = [
  { stage: 'v1', title: '目前', items: ['SEO 形象官網與一頁式網頁版型', '每組權限代碼建立 1 個網站', '網站先以預覽呈現', 'SEO 文章生產器內部使用'] },
  { stage: 'v2', title: '下一步', items: ['平台子網域', '依方案建立多個網站', '文章生產器開放客戶權限'] },
  { stage: 'v3', title: '之後', items: ['自訂網域與 DNS 設定', '網址轉址設定', '付費與私人版型'] },
];
