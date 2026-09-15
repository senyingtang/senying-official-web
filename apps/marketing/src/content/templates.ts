import type { MockVisual } from './types';

export interface TemplatePreview {
  key: string;
  name: string;
  siteType: string;
  tag: '免費' | '付費' | '方案限定' | '私人客製';
  description: string;
  visual: MockVisual;
}

export interface TemplateTier {
  tag: TemplatePreview['tag'];
  description: string;
}

/** 版型方向示意（版型商店尚未開放） */
export const templatePreviews: TemplatePreview[] = [
  { key: 'clean-brand', name: '清爽品牌官網', siteType: 'SEO 形象官網', tag: '免費', description: '首頁、服務、關於與聯絡頁的基本架構。', visual: 'website' },
  { key: 'event-signup', name: '活動報名頁', siteType: '一頁式網頁', tag: '免費', description: '活動資訊、流程與報名表單。', visual: 'landing' },
  { key: 'service-studio', name: '服務型工作室', siteType: 'SEO 形象官網', tag: '付費', description: '服務項目、作品展示與預約入口。', visual: 'website' },
  { key: 'product-showcase', name: '商品展示型', siteType: '電商網站', tag: '方案限定', description: '商品分類、規格說明與詢價入口。', visual: 'ecommerce' },
];

export const templateTiers: TemplateTier[] = [
  { tag: '免費', description: '基本版型，兌換代碼後就能使用。' },
  { tag: '付費', description: '購買授權後可以套用與發布。' },
  { tag: '方案限定', description: '特定訂閱方案才能使用。' },
  { tag: '私人客製', description: '為單一品牌設計，只有該品牌可用。' },
];
