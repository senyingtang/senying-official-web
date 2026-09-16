import type { Feature, IconFeature, StatItem } from './types';

/**
 * 案例頁的固定版面文字與說明。
 *
 * 案例本身（標題、產業、需求、做法、狀態）一律來自 CMS repository（case_studies）；
 * 這裡只保留頁面的固定文案與服務產業列表，不再重複保存案例資料。
 */

export const CASE_METRIC_NOTE = '畫面截圖與成效數據取得授權、完成統計後才會公開，目前以「整理中」標示，不放未經確認的數字。';
export const CASE_RESULTS_NOTE = '示意版面，正式案例數據待確認';

/** 精選案例成果：沿用設計稿版面，數值一律使用狀態文字 */
export const caseResults: StatItem[] = [
  { icon: 'trend', value: '整理中', label: '官網詢問數', note: 'Hungjui 形象官網' },
  { icon: 'cart', value: '整理中', label: '電商訂單流程', note: '品牌電商官網' },
  { icon: 'users', value: '內部測試中', label: '文章草稿產出', note: 'SEO 文章生產器' },
  { icon: 'calendar', value: '示範', label: '預約表單紀錄', note: '預約 / 活動頁' },
];

export const caseIndustries: IconFeature[] = [
  { icon: 'mountain', title: '旅宿觀光', description: '' },
  { icon: 'cart', title: '零售電商', description: '' },
  { icon: 'building', title: '企業品牌', description: '' },
  { icon: 'medical', title: '醫療健康', description: '' },
  { icon: 'graduation', title: '教育培訓', description: '' },
  { icon: 'factory', title: '製造工業', description: '' },
  { icon: 'utensils', title: '餐飲美食', description: '' },
  { icon: 'calendar', title: '活動展演', description: '' },
  { icon: 'cpu', title: '科技新創', description: '' },
  { icon: 'grid', title: '其他產業', description: '' },
];

export const casePrinciples: Feature[] = [
  { title: '只放可以驗證的資訊', description: '需求、做法與使用產品都以實際專案為準，不用誇大的形容包裝。' },
  { title: '取得授權才公開畫面', description: '客戶網站截圖與品牌素材，確認可以公開後才會放上。' },
  { title: '成效數字要有來源', description: '流量、詢問數等數據需要實際統計與客戶同意，整理完成前一律標示整理中。' },
];
