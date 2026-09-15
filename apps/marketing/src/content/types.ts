/**
 * 前台展示資料共用型別。
 * 目前為靜態資料；之後可替換成 CMS repository 回傳的 view model，頁面與元件不需要改。
 */
import type { IconName } from '../lib/icons';
import type { MarketingImageAsset } from './media';

export type { IconName } from '../lib/icons';

export interface Feature {
  title: string;
  description: string;
}

export interface LinkItem {
  label: string;
  /** 站內路徑；'line' 代表 LINE@ 連結、'portal' 代表客戶後台登入（由 ButtonLink 轉換） */
  href: string;
}

export interface CtaContent {
  title: string;
  description: string;
  primary: LinkItem;
  secondary?: LinkItem;
}

/** 產品示意畫面類型：以 CSS 繪製，不使用圖片，避免首屏載入大檔 */
export type MockVisual = 'website' | 'landing' | 'ecommerce' | 'promo' | 'article';

export interface ShowcaseItem {
  name: string;
  summary: string;
  href: string;
  badge: string;
  category?: string;
  tags: string[];
  visual: MockVisual;
}

/* ---- Phase 2.6B 設計稿版型用資料 ---- */

/** 帶 icon 的卡片（痛點、功能、解決方案、產業） */
export interface IconFeature extends Feature {
  icon: IconName;
  href?: string;
  linkLabel?: string;
  tag?: string;
}

export interface TimelineStep extends Feature {
  icon: IconName;
}

/** 分類 chip（key 對應卡片的 filter tags；'all' 代表全部） */
export interface ChipItem {
  key: string;
  label: string;
}

/** 海報式示意圖：純 HTML 文字與漸層，不是實際客戶作品 */
export interface PosterVisual {
  headline: string;
  sub: string;
  theme: 'red' | 'pink' | 'teal' | 'amber' | 'blue' | 'green' | 'purple' | 'slate';
}

/** 橫向輪播 / 作品卡 */
export interface RailCard {
  title: string;
  description: string;
  tag: string;
  href?: string;
  linkLabel?: string;
  image?: MarketingImageAsset;
  /** image 為 cover 時的 object-position，例如 object-[30%_50%] */
  imageClass?: string;
  visual?: MockVisual;
  poster?: PosterVisual;
  /** 卡片右上角的狀態標記，例如「示意」 */
  note?: string;
  filterTags?: string[];
}

/** 數據卡：value 不放未經確認的成效數字 */
export interface StatItem {
  icon: IconName;
  value: string;
  label: string;
  note?: string;
}
