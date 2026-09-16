import { resolveDataSourceConfig } from '@syt/database/data-source';
import { isSafeContentUrl } from '@syt/shared';
import { legalLinks, mainNav, type NavLink } from '../content/navigation';

/**
 * Header / Footer 選單（build 時取得，同一次 build 只讀一次）。
 *
 * - DATA_SOURCE=supabase：讀 cms_navigation_items（RLS nav_items_public_read：只回傳啟用中的項目）
 * - DATA_SOURCE=mock 或資料庫沒有啟用中的項目：使用 content/navigation.ts 的設計預設值
 *
 * 只接受站內路徑或 https 網址；後台改了選單之後，重新建置官網就會反映。
 */

export interface MarketingNavigation {
  main: NavLink[];
  legal: NavLink[];
  /** true：來自 CMS（cms_navigation_items）；false：使用程式碼內的預設選單 */
  fromCms: boolean;
}

let pending: Promise<MarketingNavigation> | undefined;

export function getMarketingNavigation(): Promise<MarketingNavigation> {
  pending ??= loadNavigation();
  return pending;
}

const FALLBACK: MarketingNavigation = { main: mainNav, legal: legalLinks, fromCms: false };

async function loadNavigation(): Promise<MarketingNavigation> {
  const config = resolveDataSourceConfig({
    DATA_SOURCE: import.meta.env.DATA_SOURCE,
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  });
  if (config.kind === 'mock') return FALLBACK;

  const { createPublicCmsReaders } = await import('@syt/database/public-cms');
  const items = await createPublicCmsReaders(config).structure.listNavigation();
  const toLinks = (menuKey: 'header' | 'footer'): NavLink[] =>
    items
      .filter((item) => item.menuKey === menuKey && item.enabled && item.label.trim() !== '' && isSafeContentUrl(item.href))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ label: item.label, href: item.href }));

  const main = toLinks('header');
  const legal = toLinks('footer');
  // 選單被清空時不讓官網變成沒有導覽：回到程式碼內的預設值
  return { main: main.length > 0 ? main : FALLBACK.main, legal: legal.length > 0 ? legal : FALLBACK.legal, fromCms: main.length > 0 };
}
