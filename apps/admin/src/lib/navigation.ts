import { canAccessAdminRoute, type CmsAdminRole } from '@syt/auth';

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  href?: string;
  items: NavItem[];
}

export const SITE_ID_TOKEN = ':siteId';

export const adminNav: NavGroup[] = [
  {
    key: 'overview',
    label: '總覽',
    items: [{ label: '儀表板', href: '/admin/dashboard', description: '訂單、代碼與網站概況' }],
  },
  {
    key: 'cms',
    label: '官網 CMS',
    href: '/admin/cms',
    items: [
      { label: '頁面管理', href: '/admin/cms/pages', description: '官網頁面與區塊內容' },
      { label: '選單管理', href: '/admin/cms/navigation', description: 'Header 與 Footer 選單' },
      { label: '媒體庫', href: '/admin/cms/assets', description: '圖片與檔案' },
      { label: 'SEO 管理', href: '/admin/cms/seo', description: '標題、描述、Canonical、結構化資料' },
      { label: '全站設定', href: '/admin/cms/site-settings', description: '品牌名稱、社群連結、浮動快捷列與購物車捷徑' },
    ],
  },
  {
    key: 'commerce',
    label: '商務',
    href: '/admin/commerce',
    items: [
      { label: '商品方案', href: '/admin/commerce/products', description: '可販售方案與權限對應' },
      { label: '價格', href: '/admin/commerce/prices', description: '一次購買、月繳、年繳價格' },
      { label: '訂單', href: '/admin/commerce/orders', description: '訂單與付款狀態' },
      { label: '金流設定', href: '/admin/commerce/payment-providers', description: '綠界、銀行轉帳、LINE Pay、訂閱' },
      { label: '訂閱', href: '/admin/commerce/subscriptions', description: '訂閱狀態與到期日' },
    ],
  },
  {
    key: 'access-codes',
    label: '權限代碼',
    href: '/admin/access-codes',
    items: [
      { label: '全部代碼', href: '/admin/access-codes', description: '所有代碼與狀態' },
      { label: '已產生 / 已發放', href: '/admin/access-codes/generated', description: '尚未兌換的代碼' },
      { label: '已兌換', href: '/admin/access-codes/redeemed', description: '已綁定帳號的代碼' },
    ],
  },
  {
    key: 'templates',
    label: '版型',
    href: '/admin/templates',
    items: [
      { label: '版型列表', href: '/admin/templates/list', description: '免費、付費、方案限定、私人版型' },
      { label: '版型授權', href: '/admin/templates/licenses', description: '購買與授權紀錄' },
    ],
  },
  {
    key: 'customer-sites',
    label: '客戶網站',
    href: '/admin/customer-sites',
    items: [
      { label: '網站專案', href: '/admin/customer-sites/projects', description: '所有客戶網站' },
      { label: '網域', href: '/admin/customer-sites/domains', description: '網域驗證與 SSL' },
      { label: '部署紀錄', href: '/admin/customer-sites/deployments', description: '內容版本與部署' },
    ],
  },
  {
    key: 'seo-generator',
    label: 'SEO 文章生產器',
    href: '/admin/seo-generator',
    items: [
      { label: '文章專案', href: '/admin/seo-generator/projects', description: '品牌、關鍵字與文章' },
      { label: '使用額度', href: '/admin/seo-generator/usage', description: '額度與使用紀錄' },
    ],
  },
  {
    key: 'settings',
    label: '設定',
    href: '/admin/settings',
    items: [
      { label: '後台帳號', href: '/admin/settings/users', description: '管理員帳號' },
      { label: '角色權限', href: '/admin/settings/roles', description: '五種角色的權限矩陣' },
      { label: '操作紀錄', href: '/admin/settings/audit-logs', description: 'Audit logs' },
    ],
  },
];

/**
 * 客戶後台主選單：第一版只顯示 9 項。
 * TODO（Portal mobile navigation，Phase 2.6C 只記錄方向，未實作）：
 *   手機版改為 Bottom Navigation：首頁 / 網站 / 編輯 / 發布 / 更多
 *   「更多」開 Bottom Sheet：SEO / 表單 / 網域 / 付款 / 客服 / 設定
 *   官網（apps/marketing）不使用 persistent Bottom Navigation。
 */
export const portalNav: NavGroup[] = [
  {
    key: 'portal',
    label: '客戶後台',
    items: [
      { label: '我的網站', href: '/portal/sites' },
      { label: '內容設定', href: `/portal/sites/${SITE_ID_TOKEN}/content` },
      { label: '外觀設定', href: `/portal/sites/${SITE_ID_TOKEN}/appearance` },
      { label: 'SEO 設定', href: `/portal/sites/${SITE_ID_TOKEN}/seo` },
      { label: '表單紀錄', href: `/portal/sites/${SITE_ID_TOKEN}/forms` },
      { label: '版型', href: '/portal/templates' },
      { label: '網域設定', href: `/portal/sites/${SITE_ID_TOKEN}/domain` },
      { label: '方案權限', href: '/portal/billing' },
      { label: '客服協助', href: '/portal/support' },
    ],
  },
];

export function getAdminGroup(key: string): NavGroup {
  const group = adminNav.find((item) => item.key === key);
  if (!group) throw new Error(`Unknown admin nav group: ${key}`);
  return group;
}

export function resolveSiteHref(href: string, siteId: string | null | undefined): string {
  if (!href.includes(SITE_ID_TOKEN)) return href;
  return siteId ? href.replace(SITE_ID_TOKEN, siteId) : '/portal/sites';
}

export function findActiveHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

/** 依角色過濾官方後台選單（伺服器端執行；看不到的項目直接輸入網址也會被 guard 擋下） */
export function filterAdminNav(role: CmsAdminRole): NavGroup[] {
  return adminNav
    .map((group) => ({
      ...group,
      href: group.href && canAccessAdminRoute(role, group.href) ? group.href : undefined,
      items: group.items.filter((item) => canAccessAdminRoute(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}
