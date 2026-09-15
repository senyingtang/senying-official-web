/** 對應 DB enum public.commerce_product_code */
export const PRODUCT_CODES = ['SEO', 'LP', 'ECOM', 'DM', 'AI', 'CUSTOM'] as const;
export type ProductCode = (typeof PRODUCT_CODES)[number];

export const PRODUCT_CODE_LABELS: Record<ProductCode, string> = {
  SEO: 'SEO 形象官網',
  LP: '一頁式網頁',
  ECOM: '電商網站',
  DM: '活動 DM / 宣傳頁',
  AI: 'SEO 文章生產器',
  CUSTOM: '客製專案',
};

/** 對應 DB enum public.site_type */
export const SITE_TYPES = ['seo_website', 'landing_page', 'ecommerce', 'dm_page'] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  seo_website: 'SEO 形象官網',
  landing_page: '一頁式網頁',
  ecommerce: '電商網站',
  dm_page: '活動 DM / 宣傳頁',
};

/** 第一版可自助建站的類型；其餘走客製報價 */
export const SELF_SERVE_SITE_TYPES: readonly SiteType[] = ['seo_website', 'landing_page'];

/** 對應 DB enum public.billing_interval */
export const BILLING_INTERVALS = ['one_time', 'month', 'year'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  one_time: '一次購買',
  month: '月繳',
  year: '年繳',
};
