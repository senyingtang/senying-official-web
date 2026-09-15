import type { CmsAdminRole, WorkspaceMembership } from '@syt/auth';
import type { RedeemStatus } from '@syt/shared';
import type {
  AccessCodeListItem,
  AuditLogItem,
  CustomerSiteSummary,
  DashboardStat,
  DeploymentItem,
  FormSubmissionItem,
  OrderSummary,
  PaymentProviderCardConfig,
  PortalEntitlementItem,
  PriceItem,
  ProductPlanItem,
  SeoGeneratorProjectItem,
  SiteDomainView,
  SubscriptionSummary,
  TemplateLicenseItem,
  TemplateSummary,
} from './models';
import type { MarketingSiteSettings } from './site-settings';

/**
 * Repository 介面：UI 與 Server Action 只依賴介面。
 * - mock：依 viewer 在記憶體中過濾
 * - supabase：以「使用者 session」的 client 查詢，資料範圍由 RLS 決定；portal 另外限制 workspace
 */

/** 目前檢視資料的使用者（由 server guard 建立，不傳到瀏覽器） */
export interface Viewer {
  userId: string;
  email: string;
  /** admin：森映官方後台；portal：客戶後台（即使是森映 admin，也只看自己加入的 workspace） */
  scope: 'admin' | 'portal';
  adminRole: CmsAdminRole | null;
  workspaceIds: string[];
}

export interface RepositoryContext {
  viewer?: Viewer;
}

export interface ListOptions {
  limit?: number;
  status?: string;
}

export interface IdentityRepository {
  /** admin_profiles 中啟用中的角色；非後台成員回傳 null */
  getAdminRole(userId: string): Promise<CmsAdminRole | null>;
  /** customer_workspace_members 中 active 的 workspace */
  listWorkspaceMemberships(userId: string): Promise<WorkspaceMembership[]>;
}

export interface DashboardRepository {
  getAdminStats(): Promise<DashboardStat[]>;
  getPortalStats(): Promise<DashboardStat[]>;
}

export interface RedeemOutcome {
  status: RedeemStatus;
  workspaceId?: string | null;
  /** 兌換後可直接前往的網站；null 代表需先建立網站 */
  siteId?: string | null;
  /** DB 原始 result，僅供伺服器端記錄 */
  rawResult?: string;
}

export interface AccessCodeRepository {
  list(options?: ListOptions): Promise<AccessCodeListItem[]>;
  /** supabase：RPC create_workspace_from_access_code（交易安全、冪等、含暴力猜測限制） */
  redeem(code: string): Promise<RedeemOutcome>;
}

export interface CommerceRepository {
  listProducts(): Promise<ProductPlanItem[]>;
  listPrices(): Promise<PriceItem[]>;
  listOrders(options?: ListOptions): Promise<OrderSummary[]>;
  listSubscriptions(options?: ListOptions): Promise<SubscriptionSummary[]>;
  listPaymentProviderCards(): Promise<PaymentProviderCardConfig[]>;
}

export interface CustomerSiteRepository {
  /** 依 viewer 範圍列出網站 */
  listSites(): Promise<CustomerSiteSummary[]>;
  getSite(siteId: string): Promise<CustomerSiteSummary | null>;
  /** site guard 使用：回傳網站所屬 workspace；不存在或無權限回傳 null */
  getSiteWorkspaceId(siteId: string): Promise<string | null>;
  listDomains(siteId?: string): Promise<SiteDomainView[]>;
  listDeployments(): Promise<DeploymentItem[]>;
  listFormSubmissions(siteId: string): Promise<FormSubmissionItem[]>;
}

export interface TemplateRepository {
  listTemplates(): Promise<TemplateSummary[]>;
  listLicenses(): Promise<TemplateLicenseItem[]>;
}

export interface SeoGeneratorRepository {
  listProjects(): Promise<SeoGeneratorProjectItem[]>;
}

export interface SettingsRepository {
  listAuditLogs(options?: ListOptions): Promise<AuditLogItem[]>;
}

export interface PortalRepository {
  listEntitlements(): Promise<PortalEntitlementItem[]>;
}

/**
 * 官網全站設定（cms_site_settings：site.brand / site.socials / site.floating_actions）。
 * 寫入必須先經過 server action 的角色檢查；supabase 模式另由 RLS（owner / admin）把關。
 */
export interface SiteSettingsUpdateResult {
  persisted: boolean;
  changedKeys: string[];
  auditLogged: boolean;
}

export interface SiteSettingsRepository {
  getMarketingSiteSettings(): Promise<MarketingSiteSettings>;
  /**
   * persisted=false：mock 模式不寫入任何資料。
   * changedKeys：實際寫入的設定 key（內容沒變更的列不寫入）；auditLogged：是否已寫入 audit_logs（site_settings.update）。
   * 權限不足時丟出 SupabasePermissionError（isPermissionDeniedError 可辨識）。
   */
  updateMarketingSiteSettings(settings: MarketingSiteSettings): Promise<SiteSettingsUpdateResult>;
}

export interface Repositories {
  identity: IdentityRepository;
  dashboard: DashboardRepository;
  accessCodes: AccessCodeRepository;
  commerce: CommerceRepository;
  customerSites: CustomerSiteRepository;
  templates: TemplateRepository;
  seoGenerator: SeoGeneratorRepository;
  settings: SettingsRepository;
  portal: PortalRepository;
  siteSettings: SiteSettingsRepository;
}
