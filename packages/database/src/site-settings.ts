/**
 * 官網全站設定（Phase 2.6C）：品牌名稱、社群連結、浮動快捷列、購物車捷徑。
 *
 * - 資料表：cms_site_settings（DB SQL v2.0 既有），setting_key = site.brand / site.socials / site.floating_actions
 * - RLS：is_public 的設定公開可讀；owner / admin 可寫；後台其他角色唯讀
 * - 本檔沒有任何 import：Astro 前台、Next.js 後台與 Node 驗收腳本都可以直接載入
 */

export const SOCIAL_PLATFORMS = ['line', 'facebook', 'instagram', 'threads', 'youtube', 'tiktok', 'email', 'phone'] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  line: 'LINE',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  email: 'Email',
  phone: '電話',
};

export type SocialLinkSetting = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  enabled: boolean;
  sortOrder: number;
  openInNewTab: boolean;
  showOnDesktop: boolean;
  showOnMobile: boolean;
};

export type FloatingActionSettings = {
  enabled: boolean;
  defaultCollapsed: boolean;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  /** 購物車捷徑：購物車流程正式上線前預設關閉 */
  cartEnabled: boolean;
  cartHref: string;
  cartLabel: string;
  cartBadgeEnabled: boolean;
};

export type BrandSettings = {
  brandNameZh: string;
  brandNameEn: string;
  footerBrandName: string;
  /** 空字串代表使用內建 Logo */
  logoUrl: string;
  faviconUrl: string;
};

export type MarketingSiteSettings = {
  brand: BrandSettings;
  socials: SocialLinkSetting[];
  floatingActions: FloatingActionSettings;
};

export const SITE_SETTING_KEYS = {
  brand: 'site.brand',
  socials: 'site.socials',
  floatingActions: 'site.floating_actions',
} as const;

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  brandNameZh: '森映',
  brandNameEn: 'SEN YING',
  footerBrandName: '森映 SEN YING',
  logoUrl: '',
  faviconUrl: '/favicon.svg',
};

export const DEFAULT_FLOATING_ACTION_SETTINGS: FloatingActionSettings = {
  enabled: true,
  defaultCollapsed: false,
  desktopEnabled: true,
  mobileEnabled: true,
  cartEnabled: false,
  cartHref: '/cart',
  cartLabel: '購物車',
  cartBadgeEnabled: true,
};

function social(platform: SocialPlatform, sortOrder: number, overrides: Partial<SocialLinkSetting> = {}): SocialLinkSetting {
  const isWeb = platform !== 'email' && platform !== 'phone';
  return {
    id: platform,
    platform,
    label: SOCIAL_PLATFORM_LABELS[platform],
    url: '',
    enabled: false,
    sortOrder,
    openInNewTab: isWeb,
    showOnDesktop: true,
    showOnMobile: true,
    ...overrides,
  };
}

/**
 * 預設設定（mock 與 migration 0016 seed 相同）。
 * 社群帳號尚未提供正式網址：enabled 但 url 空白的平台不會顯示，後台填入網址後才會出現。
 */
export function createDefaultMarketingSiteSettings(): MarketingSiteSettings {
  return {
    brand: { ...DEFAULT_BRAND_SETTINGS },
    socials: [
      social('line', 10, { enabled: true, url: '/contact#line', openInNewTab: false }),
      social('instagram', 20, { enabled: true }),
      social('facebook', 30, { enabled: true }),
      social('threads', 40, { enabled: true }),
      social('youtube', 50, { enabled: true }),
      social('tiktok', 60),
      social('email', 70, { enabled: true, label: 'Email / 聯絡表單', url: '/contact', openInNewTab: false }),
      social('phone', 80),
    ],
    floatingActions: { ...DEFAULT_FLOATING_ACTION_SETTINGS },
  };
}

export type MockSiteSettingsPreset = 'default' | 'verification';

/**
 * Mock 設定。
 * verification：只給 pnpm global-ui:verify 的驗收 build 使用（example.com / @example 網址、開啟購物車捷徑），不可部署。
 */
export function getMockMarketingSiteSettings(preset: string | undefined = 'default'): MarketingSiteSettings {
  const settings = createDefaultMarketingSiteSettings();
  if (preset !== 'verification') return settings;
  return {
    brand: settings.brand,
    socials: [
      social('line', 10, { enabled: true, url: 'https://line.me/R/ti/p/@example' }),
      social('instagram', 20, { enabled: true, url: 'https://www.instagram.com/example', showOnMobile: false }),
      social('facebook', 30, { enabled: true, url: 'https://www.facebook.com/example' }),
      social('threads', 40, { enabled: true, url: 'https://www.threads.net/@example' }),
      social('youtube', 50, { enabled: true, url: 'https://www.youtube.com/@example' }),
      social('tiktok', 60, { enabled: false, url: 'https://www.tiktok.com/@example' }),
      social('email', 70, { enabled: true, url: 'mailto:hello@example.com', openInNewTab: false }),
      social('phone', 80, { enabled: true, url: '' }),
    ],
    floatingActions: { ...settings.floatingActions, cartEnabled: true, cartHref: '/cart', cartBadgeEnabled: true },
  };
}

/** 只允許 https / http、mailto:（Email）、tel:（電話）與站內路徑；javascript: 等一律拒絕 */
export function isSafeSocialUrl(platform: SocialPlatform, url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (platform === 'email') return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
  if (platform === 'phone') return /^tel:\+?[0-9-]{6,20}$/.test(value);
  return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(value);
}

/** 可作為 Organization JSON-LD sameAs 的社群平台（LINE 加好友連結、Email、電話不放 sameAs） */
export const SAME_AS_PLATFORMS: readonly SocialPlatform[] = ['facebook', 'instagram', 'threads', 'youtube', 'tiktok'];

/** 示範 / placeholder 網址：example.com 系列網域、localhost、路徑為 example / @example 或含 placeholder */
export function isPlaceholderUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (/(^|\.)example\.(com|org|net)$/i.test(parsed.hostname) || /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) return true;
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.some((segment) => /^@?example$/i.test(segment)) || /placeholder/i.test(url);
  } catch {
    return true;
  }
}

/** Organization sameAs：只取已啟用、http / https、非 placeholder 的社群網址，依 sortOrder 排序並去重 */
export function resolveSameAsUrls(socials: SocialLinkSetting[]): string[] {
  const urls = resolveVisibleSocials(socials, 'any')
    .filter((item) => SAME_AS_PLATFORMS.includes(item.platform))
    .map((item) => item.url.trim())
    .filter((url) => /^https?:\/\/\S+$/i.test(url) && !isPlaceholderUrl(url));
  return [...new Set(urls)];
}

/** 可以顯示的社群連結：enabled、網址有效、符合裝置設定，依 sortOrder 排序 */
export function resolveVisibleSocials(socials: SocialLinkSetting[], device: 'desktop' | 'mobile' | 'any'): SocialLinkSetting[] {
  return socials
    .filter((item) => item.enabled && isSafeSocialUrl(item.platform, item.url))
    .filter((item) => (device === 'desktop' ? item.showOnDesktop : device === 'mobile' ? item.showOnMobile : true))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface SiteSettingsValidation {
  ok: boolean;
  errors: Record<string, string>;
}

/** 後台儲存前的伺服器端驗證（欄位名稱對應後台表單 name） */
export function validateMarketingSiteSettings(settings: MarketingSiteSettings): SiteSettingsValidation {
  const errors: Record<string, string> = {};
  if (!settings.brand.brandNameZh.trim()) errors.brand_name_zh = '請填寫中文品牌名稱';
  if (!settings.brand.brandNameEn.trim()) errors.brand_name_en = '請填寫英文品牌名稱';
  if (settings.brand.brandNameEn !== settings.brand.brandNameEn.toUpperCase()) errors.brand_name_en = '英文品牌名稱請使用全大寫（例如 SEN YING）';
  for (const [field, value] of [
    ['logo_url', settings.brand.logoUrl],
    ['favicon_url', settings.brand.faviconUrl],
  ] as const) {
    if (value && !/^(\/(?!\/)|https:\/\/)/.test(value)) errors[field] = '請使用站內路徑（/ 開頭）或 https 網址';
  }
  for (const item of settings.socials) {
    if (item.url && !isSafeSocialUrl(item.platform, item.url)) {
      errors[`social.${item.platform}.url`] =
        item.platform === 'email' ? '請使用 mailto: 或站內路徑' : item.platform === 'phone' ? '請使用 tel: 開頭的電話號碼' : '請使用 https:// 網址或站內路徑';
    }
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0 || item.sortOrder > 9999) errors[`social.${item.platform}.sort_order`] = '排序請填 0–9999 的整數';
    if (!item.label.trim()) errors[`social.${item.platform}.label`] = '請填寫顯示名稱';
  }
  if (!/^\/(?!\/)/.test(settings.floatingActions.cartHref)) errors['cart.href'] = '購物車連結請使用站內路徑（/ 開頭）';
  if (!settings.floatingActions.cartLabel.trim()) errors['cart.label'] = '請填寫購物車文字';
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ---- 資料表對應（setting_value 使用 snake_case） ---- */

type Json = Record<string, unknown>;
const text = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback);
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const int = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isInteger(value) ? value : fallback);
const record = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});

export interface SiteSettingRow {
  setting_key: string;
  setting_value: unknown;
}

/**
 * cms_site_settings 資料列 → MarketingSiteSettings。
 * 資料表缺少的欄位使用上方預設值（預設值本身就是公開的正式設定，不是示範資料）。
 */
export function siteSettingsFromRows(rows: SiteSettingRow[]): MarketingSiteSettings {
  const defaults = createDefaultMarketingSiteSettings();
  const byKey = new Map(rows.map((row) => [row.setting_key, record(row.setting_value)]));
  const brand = byKey.get(SITE_SETTING_KEYS.brand) ?? {};
  const socials = byKey.get(SITE_SETTING_KEYS.socials) ?? {};
  const floating = byKey.get(SITE_SETTING_KEYS.floatingActions) ?? {};
  const cart = record(floating.cart);
  const storedSocials = Array.isArray(socials.items) ? socials.items.map(record) : [];

  return {
    brand: {
      brandNameZh: text(brand.name_zh, defaults.brand.brandNameZh),
      brandNameEn: text(brand.name_en, defaults.brand.brandNameEn),
      footerBrandName: text(brand.footer_name, defaults.brand.footerBrandName),
      logoUrl: text(brand.logo_url, defaults.brand.logoUrl),
      faviconUrl: text(brand.favicon_url, defaults.brand.faviconUrl),
    },
    socials: defaults.socials.map((fallback) => {
      const stored = storedSocials.find((item) => item.platform === fallback.platform);
      if (!stored) return fallback;
      return {
        id: text(stored.id, fallback.id),
        platform: fallback.platform,
        label: text(stored.label, fallback.label),
        url: text(stored.url, ''),
        enabled: bool(stored.enabled, false),
        sortOrder: int(stored.sort_order, fallback.sortOrder),
        openInNewTab: bool(stored.open_in_new_tab, fallback.openInNewTab),
        showOnDesktop: bool(stored.show_on_desktop, true),
        showOnMobile: bool(stored.show_on_mobile, true),
      };
    }),
    floatingActions: {
      enabled: bool(floating.enabled, defaults.floatingActions.enabled),
      defaultCollapsed: bool(floating.default_collapsed, defaults.floatingActions.defaultCollapsed),
      desktopEnabled: bool(floating.desktop_enabled, defaults.floatingActions.desktopEnabled),
      mobileEnabled: bool(floating.mobile_enabled, defaults.floatingActions.mobileEnabled),
      cartEnabled: bool(cart.enabled, defaults.floatingActions.cartEnabled),
      cartHref: text(cart.href, defaults.floatingActions.cartHref),
      cartLabel: text(cart.label, defaults.floatingActions.cartLabel),
      cartBadgeEnabled: bool(cart.show_badge, defaults.floatingActions.cartBadgeEnabled),
    },
  };
}

/** MarketingSiteSettings → cms_site_settings upsert 資料（全部為公開設定） */
export function siteSettingsToRows(settings: MarketingSiteSettings): { setting_key: string; setting_value: Json; is_public: boolean }[] {
  return [
    {
      setting_key: SITE_SETTING_KEYS.brand,
      is_public: true,
      setting_value: {
        name: `${settings.brand.brandNameZh} ${settings.brand.brandNameEn}`.trim(),
        name_zh: settings.brand.brandNameZh,
        name_en: settings.brand.brandNameEn,
        footer_name: settings.brand.footerBrandName,
        logo_url: settings.brand.logoUrl,
        favicon_url: settings.brand.faviconUrl,
      },
    },
    {
      setting_key: SITE_SETTING_KEYS.socials,
      is_public: true,
      setting_value: {
        items: settings.socials.map((item) => ({
          id: item.id,
          platform: item.platform,
          label: item.label,
          url: item.url,
          enabled: item.enabled,
          sort_order: item.sortOrder,
          open_in_new_tab: item.openInNewTab,
          show_on_desktop: item.showOnDesktop,
          show_on_mobile: item.showOnMobile,
        })),
      },
    },
    {
      setting_key: SITE_SETTING_KEYS.floatingActions,
      is_public: true,
      setting_value: {
        enabled: settings.floatingActions.enabled,
        default_collapsed: settings.floatingActions.defaultCollapsed,
        desktop_enabled: settings.floatingActions.desktopEnabled,
        mobile_enabled: settings.floatingActions.mobileEnabled,
        cart: {
          enabled: settings.floatingActions.cartEnabled,
          href: settings.floatingActions.cartHref,
          label: settings.floatingActions.cartLabel,
          show_badge: settings.floatingActions.cartBadgeEnabled,
        },
      },
    },
  ];
}
