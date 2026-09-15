import { resolveDataSourceConfig } from '@syt/database/data-source';
import { getMockMarketingSiteSettings, resolveVisibleSocials, type MarketingSiteSettings, type SocialLinkSetting } from '@syt/database/site-settings';

let pending: Promise<MarketingSiteSettings> | undefined;

/**
 * 官網全站設定（build 時取得，同一次 build 只讀一次）。
 * - DATA_SOURCE=mock（預設）：packages/database 的 mock 設定
 * - DATA_SOURCE=supabase：以 anon key 讀取 cms_site_settings 中 is_public 的設定（RLS 限制），不使用 service role
 * 設定錯誤時直接讓 build 失敗，不默默改用其他資料。
 */
export function getMarketingSiteSettings(): Promise<MarketingSiteSettings> {
  pending ??= loadSettings();
  return pending;
}

async function loadSettings(): Promise<MarketingSiteSettings> {
  const config = resolveDataSourceConfig({
    DATA_SOURCE: import.meta.env.DATA_SOURCE,
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  });
  if (config.kind === 'mock') return getMockMarketingSiteSettings(import.meta.env.SITE_SETTINGS_MOCK_PRESET);
  const { readPublicMarketingSiteSettings } = await import('@syt/database/public-site-settings');
  return readPublicMarketingSiteSettings(config);
}

export interface FloatingActionsView {
  desktop: boolean;
  mobile: boolean;
  desktopSocials: SocialLinkSetting[];
  mobileSocials: SocialLinkSetting[];
}

/** 浮動快捷列在桌機 / 手機是否顯示（沒有任何可用項目時不顯示） */
export function floatingActionsView(settings: MarketingSiteSettings): FloatingActionsView {
  const fa = settings.floatingActions;
  const desktopSocials = resolveVisibleSocials(settings.socials, 'desktop');
  const mobileSocials = resolveVisibleSocials(settings.socials, 'mobile');
  return {
    desktop: fa.enabled && fa.desktopEnabled && (desktopSocials.length > 0 || fa.cartEnabled),
    mobile: fa.enabled && fa.mobileEnabled && (mobileSocials.length > 0 || fa.cartEnabled),
    desktopSocials,
    mobileSocials,
  };
}
