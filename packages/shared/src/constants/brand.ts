/**
 * 正式公開品牌：中文「森映」、英文「SEN YING」（全大寫，不使用 Sen Ying 或舊名稱）。
 * 官網實際顯示的品牌名稱由 CMS 全站設定（cms_site_settings: site.brand）提供，這裡是預設值與 SEO 用的固定名稱。
 */
export const BRAND = {
  nameZh: '森映',
  nameEn: 'SEN YING',
  name: '森映 SEN YING',
  shortName: '森映',
  platformName: '森映 Headless 自助建站電商平台',
  tagline: '把網站、App 和內容，做成真的能用的產品',
  description: '森映把品牌官網、一頁式網頁、電商網站與 SEO 內容整理成可上線、可管理、可持續經營的數位產品。',
} as const;

/**
 * 文案檢查用：品牌語氣避免的制式句型。
 * 可在 CMS 儲存前或 CI 內容檢查時使用。
 */
export const BANNED_COPY_PHRASES = ['專注於', '致力於', '賦能', '一站式', '引領未來', '打造卓越', '引領數位轉型', '全方位解決方案'] as const;

export function findBannedPhrases(text: string): string[] {
  return BANNED_COPY_PHRASES.filter((phrase) => text.includes(phrase));
}
