import type { Feature } from './types';

export const contactServiceTypes = [
  { value: 'seo-website', label: 'SEO 形象官網', hint: '多頁式品牌官網' },
  { value: 'landing-page', label: '一頁式網頁', hint: '活動、課程、預約' },
  { value: 'ecommerce', label: '電商網站', hint: '商品、金流、訂單' },
  { value: 'promo', label: '活動 DM / 宣傳頁', hint: '社群圖、活動頁、印刷' },
  { value: 'article', label: 'SEO 文章生產器', hint: '開放時通知' },
  { value: 'custom', label: '客製服務 / 其他', hint: '系統、App、網站翻新' },
];

export const contactNeeds = ['新網站', '舊網站翻新', '手機版跑版', 'SEO 設定', '表單與預約', '活動報名', '商品販售', '文章經營'];

export const contactBudgets = ['尚未確定', '3 萬以下', '3–10 萬', '10–30 萬', '30 萬以上'];

export const contactTimelines = ['1 個月內', '1–3 個月', '3 個月以上', '還在評估'];

export const contactPreferences = ['LINE', 'Email', '電話'];

export const contactMethods = [
  { label: 'LINE@', value: 'LINE 官方帳號，回覆最快' },
  { label: 'Email', value: '正式聯絡信箱整理中' },
  { label: '回覆時間', value: '工作日依收到順序回覆' },
];

export const contactSteps: Feature[] = [
  { title: '確認需求', description: '先了解網站目的、現有素材與時程。' },
  { title: '建議做法', description: '說明適合自助建站或客製，並列出範圍。' },
  { title: '報價或開通', description: '客製專案提供報價；自助方案協助開通。' },
];
