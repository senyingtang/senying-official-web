import type { IconFeature, IconName, PosterVisual } from './types';

/**
 * 文章分類的「呈現設定」。
 *
 * 分類名稱與文章內容一律來自 CMS repository（blog_categories / blog_posts）；
 * 這裡只保存每個分類在官網上的 icon、補充說明與封面色系，避免把同一份文字存兩套。
 */
export interface BlogCategoryPresentation {
  icon: IconName;
  description: string;
  theme: PosterVisual['theme'];
}

export const BLOG_CATEGORY_PRESENTATION: Record<string, BlogCategoryPresentation> = {
  seo: { icon: 'search', description: '網站架構、關鍵字與結構化資料。', theme: 'blue' },
  'web-design': { icon: 'layout', description: '頁面規劃、版型選擇與上線前檢查。', theme: 'slate' },
  'content-marketing': { icon: 'pen', description: '活動頁、文章與社群內容的安排。', theme: 'purple' },
  tools: { icon: 'code', description: '後台操作、網域設定與文章生產器。', theme: 'teal' },
  brand: { icon: 'heart', description: '品牌介紹、服務說明與長期經營。', theme: 'red' },
  'case-sharing': { icon: 'users', description: '專案做法與整理方式。', theme: 'green' },
  insights: { icon: 'trend', description: '電商、金流與數位行銷的觀察。', theme: 'amber' },
};

export const DEFAULT_BLOG_PRESENTATION: BlogCategoryPresentation = { icon: 'book', description: '其他主題。', theme: 'slate' };

export function blogCategoryPresentation(slug: string): BlogCategoryPresentation {
  return BLOG_CATEGORY_PRESENTATION[slug] ?? DEFAULT_BLOG_PRESENTATION;
}

export const blogHeroHighlights: IconFeature[] = [
  { icon: 'star', title: '實戰經驗分享', description: '做網站時實際遇到的問題' },
  { icon: 'trend', title: '產業趨勢解析', description: '電商與內容經營的變化' },
  { icon: 'book', title: '工具教學指南', description: '後台、網域與文章工具' },
  { icon: 'heart', title: '品牌成長思維', description: '讓網站能長期經營' },
];
