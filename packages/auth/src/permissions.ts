import type { CmsAdminRole, WorkspaceRole } from './roles';

/**
 * UI / Server Action 權限判斷（對應 RLS_SPEC_v2.md 角色矩陣）。
 * UI 隱藏不是安全控制：Server Action 必須再檢查一次，資料庫 RLS 為最後防線。
 */
export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export type AdminResource =
  | 'dashboard'
  | 'cms_content'
  | 'cms_settings'
  | 'navigation'
  | 'blog_own'
  | 'commerce'
  | 'payment_providers'
  | 'access_codes'
  | 'templates'
  | 'customer_sites'
  | 'seo_generator'
  | 'admin_users'
  | 'audit_logs';

type Matrix<R extends string, Role extends string> = Record<R, Record<Role, readonly PermissionAction[]>>;

const ALL: readonly PermissionAction[] = ['read', 'create', 'update', 'delete'];
const CRU: readonly PermissionAction[] = ['read', 'create', 'update'];
const R: readonly PermissionAction[] = ['read'];
const NONE: readonly PermissionAction[] = [];

const ADMIN_MATRIX: Matrix<AdminResource, CmsAdminRole> = {
  dashboard: { owner: R, admin: R, editor: R, author: R, viewer: R },
  cms_content: { owner: ALL, admin: ALL, editor: ALL, author: R, viewer: R },
  cms_settings: { owner: ALL, admin: ALL, editor: R, author: R, viewer: R },
  navigation: { owner: ALL, admin: ALL, editor: R, author: R, viewer: R },
  blog_own: { owner: ALL, admin: ALL, editor: ALL, author: CRU, viewer: R },
  commerce: { owner: ALL, admin: ALL, editor: NONE, author: NONE, viewer: NONE },
  payment_providers: { owner: ALL, admin: ALL, editor: NONE, author: NONE, viewer: NONE },
  // 代碼只能由系統產生：沒有 create；update 僅限撤銷
  access_codes: { owner: ['read', 'update'], admin: ['read', 'update'], editor: NONE, author: NONE, viewer: NONE },
  templates: { owner: ALL, admin: ALL, editor: R, author: R, viewer: R },
  customer_sites: { owner: ALL, admin: ALL, editor: NONE, author: NONE, viewer: NONE },
  seo_generator: { owner: ALL, admin: ALL, editor: CRU, author: CRU, viewer: R },
  admin_users: { owner: ALL, admin: R, editor: R, author: R, viewer: R },
  audit_logs: { owner: R, admin: R, editor: NONE, author: NONE, viewer: NONE },
};

export type PortalResource = 'sites' | 'site_content' | 'site_publish' | 'form_submissions' | 'domains' | 'members' | 'billing' | 'templates';

const PORTAL_MATRIX: Matrix<PortalResource, WorkspaceRole> = {
  sites: { owner: CRU, admin: CRU, editor: R, viewer: R },
  site_content: { owner: ALL, admin: ALL, editor: ALL, viewer: R },
  site_publish: { owner: ['read', 'update'], admin: ['read', 'update'], editor: R, viewer: R },
  form_submissions: { owner: ALL, admin: ALL, editor: ['read', 'update'], viewer: R },
  domains: { owner: ALL, admin: ALL, editor: R, viewer: R },
  members: { owner: ALL, admin: ALL, editor: R, viewer: R },
  billing: { owner: R, admin: R, editor: NONE, viewer: NONE },
  templates: { owner: R, admin: R, editor: R, viewer: R },
};

export function canAdmin(role: CmsAdminRole | null | undefined, resource: AdminResource, action: PermissionAction = 'read'): boolean {
  if (!role) return false;
  return ADMIN_MATRIX[resource][role].includes(action);
}

export function canPortal(role: WorkspaceRole | null | undefined, resource: PortalResource, action: PermissionAction = 'read'): boolean {
  if (!role) return false;
  return PORTAL_MATRIX[resource][role].includes(action);
}

// ---------------------------------------------------------------------------
// 官方後台路由保護（Phase 2 第一版）
// ---------------------------------------------------------------------------

export interface AdminRouteRule {
  prefix: string;
  /** 可進入的角色 */
  roles: readonly CmsAdminRole[];
  /** 可進入但只能檢視的角色（UI 顯示 PermissionNotice；寫入仍由 Server Action 與 RLS 把關） */
  readOnlyRoles?: readonly CmsAdminRole[];
  /** true 時只比對完全相同的路徑 */
  exact?: boolean;
  note?: string;
}

const STAFF_ROLES: readonly CmsAdminRole[] = ['owner', 'admin', 'editor', 'author', 'viewer'];

/**
 * owner：全部
 * admin：全部；後台帳號管理保留給 owner（admin 唯讀）
 * editor：CMS、客戶網站內容、文章生產器
 * author：文章與內容草稿
 * viewer：儀表板與指定資料唯讀
 */
export const ADMIN_ROUTE_RULES: readonly AdminRouteRule[] = [
  { prefix: '/admin', roles: STAFF_ROLES, exact: true },
  { prefix: '/admin/dashboard', roles: STAFF_ROLES, readOnlyRoles: ['viewer'] },
  { prefix: '/admin/cms', roles: STAFF_ROLES, readOnlyRoles: ['viewer'] },
  { prefix: '/admin/cms/pages', roles: STAFF_ROLES, readOnlyRoles: ['author', 'viewer'], note: 'author 只能編輯自己的文章草稿' },
  { prefix: '/admin/cms/navigation', roles: ['owner', 'admin', 'editor', 'viewer'], readOnlyRoles: ['editor', 'viewer'] },
  { prefix: '/admin/cms/assets', roles: ['owner', 'admin', 'editor', 'author'] },
  { prefix: '/admin/cms/seo', roles: ['owner', 'admin', 'editor'] },
  {
    prefix: '/admin/cms/site-settings',
    roles: ['owner', 'admin', 'editor', 'viewer'],
    readOnlyRoles: ['editor', 'viewer'],
    note: '品牌名稱、社群網址與浮動快捷列只有 owner 與 admin 可以修改。',
  },
  { prefix: '/admin/commerce', roles: ['owner', 'admin'] },
  { prefix: '/admin/access-codes', roles: ['owner', 'admin'] },
  { prefix: '/admin/templates', roles: ['owner', 'admin'] },
  { prefix: '/admin/customer-sites', roles: ['owner', 'admin', 'editor'], readOnlyRoles: ['editor'] },
  { prefix: '/admin/seo-generator', roles: ['owner', 'admin', 'editor', 'author'] },
  { prefix: '/admin/seo-generator/usage', roles: ['owner', 'admin'] },
  { prefix: '/admin/settings', roles: ['owner', 'admin'] },
  { prefix: '/admin/settings/users', roles: ['owner', 'admin'], readOnlyRoles: ['admin'], note: '後台帳號只有 owner 可以新增、修改或停用' },
];

function normalizePath(pathname: string): string {
  return pathname.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/';
}

export function findAdminRouteRule(pathname: string): AdminRouteRule | null {
  const path = normalizePath(pathname);
  let best: AdminRouteRule | null = null;
  for (const rule of ADMIN_ROUTE_RULES) {
    const matches = rule.exact ? path === rule.prefix : path === rule.prefix || path.startsWith(`${rule.prefix}/`);
    if (matches && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best;
}

/** 未列在規則中的 /admin 路徑預設只允許 owner / admin（deny by default） */
export function canAccessAdminRoute(role: CmsAdminRole | null | undefined, pathname: string): boolean {
  if (!role) return false;
  const rule = findAdminRouteRule(pathname);
  if (!rule) return role === 'owner' || role === 'admin';
  return rule.roles.includes(role);
}

export function adminRouteMode(role: CmsAdminRole | null | undefined, pathname: string): 'manage' | 'read_only' | 'none' {
  if (!canAccessAdminRoute(role, pathname) || !role) return 'none';
  const rule = findAdminRouteRule(pathname);
  if (role === 'viewer' || rule?.readOnlyRoles?.includes(role)) return 'read_only';
  return 'manage';
}
