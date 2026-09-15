import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORMS, type MarketingSiteSettings, type SocialLinkSetting } from '@syt/database/site-settings';

export type SiteSettingsFormStatus = 'idle' | 'saved' | 'mock' | 'invalid' | 'forbidden' | 'error';

export interface SiteSettingsFormState {
  status: SiteSettingsFormStatus;
  message: string;
  /** key 為表單欄位 name */
  errors: Record<string, string>;
}

export const initialSiteSettingsFormState: SiteSettingsFormState = { status: 'idle', message: '', errors: {} };

const field = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();
const checked = (formData: FormData, name: string): boolean => formData.get(name) === 'on';
const integer = (value: string): number => (value === '' ? Number.NaN : Number(value));

/** 全站設定表單 → MarketingSiteSettings（驗證由 validateMarketingSiteSettings 在 server action 執行） */
export function parseSiteSettingsForm(formData: FormData): MarketingSiteSettings {
  return {
    brand: {
      brandNameZh: field(formData, 'brand_name_zh'),
      brandNameEn: field(formData, 'brand_name_en'),
      footerBrandName: field(formData, 'footer_brand_name'),
      logoUrl: field(formData, 'logo_url'),
      faviconUrl: field(formData, 'favicon_url'),
    },
    socials: SOCIAL_PLATFORMS.map<SocialLinkSetting>((platform) => ({
      id: platform,
      platform,
      label: field(formData, `social.${platform}.label`) || SOCIAL_PLATFORM_LABELS[platform],
      url: field(formData, `social.${platform}.url`),
      enabled: checked(formData, `social.${platform}.enabled`),
      sortOrder: integer(field(formData, `social.${platform}.sort_order`)),
      openInNewTab: checked(formData, `social.${platform}.open_in_new_tab`),
      showOnDesktop: checked(formData, `social.${platform}.show_on_desktop`),
      showOnMobile: checked(formData, `social.${platform}.show_on_mobile`),
    })),
    floatingActions: {
      enabled: checked(formData, 'fa.enabled'),
      defaultCollapsed: checked(formData, 'fa.default_collapsed'),
      desktopEnabled: checked(formData, 'fa.desktop_enabled'),
      mobileEnabled: checked(formData, 'fa.mobile_enabled'),
      cartEnabled: checked(formData, 'cart.enabled'),
      cartHref: field(formData, 'cart.href'),
      cartLabel: field(formData, 'cart.label'),
      cartBadgeEnabled: checked(formData, 'cart.show_badge'),
    },
  };
}
