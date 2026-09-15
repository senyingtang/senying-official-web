/**
 * 對應 cms_site_settings.platform.feature_flags（DB SQL v2.0 seed）。
 * Phase 1 以此預設值渲染 UI；接上資料庫後改由 DB 讀取。
 */
export const PLATFORM_FEATURE_FLAGS_V1 = {
  'site_builder.self_serve': true,
  'site_builder.public_publish': false,
  'site_builder.platform_subdomain': false,
  'site_builder.custom_domain': false,
  'ai_article_generator.customer_access': false,
  'template_marketplace.paid_templates': false,
  'commerce.checkout_enabled': false,
  'commerce.live_payments': false,
} as const;

export type PlatformFeatureFlag = keyof typeof PLATFORM_FEATURE_FLAGS_V1;
export type PlatformFeatureFlags = Record<PlatformFeatureFlag, boolean>;

export const RELEASE_PHASES = {
  v1: '模板制自助建站（SEO 形象官網、一頁式網頁），只建立網站資料與預覽，不公開發布',
  v2: '森映平台子網域、依方案開放多網站、SEO 文章生產器開放客戶',
  v3: '客戶自訂網域、DNS 設定與轉址',
} as const;
