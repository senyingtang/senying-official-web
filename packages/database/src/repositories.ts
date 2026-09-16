import type { CmsAdminRole, WorkspaceMembership } from '@syt/auth';
import type { MarketingRouteGroup, RedeemStatus } from '@syt/shared';
import type {
  BlogCategoryOption,
  BlogPostDetail,
  BlogPostInput,
  BlogPostSummary,
  CaseStudyDetail,
  CaseStudyInput,
  CaseStudySummary,
  ContentStatus,
} from './cms-content';
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

// ---------------------------------------------------------------------------
// 官網 CMS 內容（Phase 2.9）
// ---------------------------------------------------------------------------

export interface ContentListOptions {
  /** 標題 / slug / 摘要關鍵字（不分大小寫） */
  search?: string;
  /** 'all' 或未指定：不過濾狀態 */
  status?: ContentStatus | 'all';
  /** Blog：分類 slug */
  category?: string;
  /** Case：產業 */
  industry?: string;
  featured?: boolean;
  limit?: number;
}

/**
 * 內容寫入結果。
 * persisted=false：mock 模式（記憶體暫存，不寫入任何資料庫，重新啟動即消失）。
 * 權限不足時丟出 SupabasePermissionError（isPermissionDeniedError 可辨識）。
 */
export interface ContentWriteResult {
  persisted: boolean;
  id: string;
  slug: string;
  auditLogged: boolean;
}

export type ContentStatusCounts = Record<ContentStatus, number>;

/**
 * 官網文章。
 * - listPublished / getPublishedBySlug：前台（Astro build）使用，只回傳前台可見的內容
 * - 其餘：後台使用，資料範圍由 RLS 決定（viewer 只能讀、author 只能改自己的草稿）
 */
export interface CmsBlogRepository {
  listPublished(options?: { limit?: number }): Promise<BlogPostSummary[]>;
  getPublishedBySlug(slug: string): Promise<BlogPostDetail | null>;
  listAdmin(options?: ContentListOptions): Promise<BlogPostSummary[]>;
  getById(id: string): Promise<BlogPostDetail | null>;
  listCategories(): Promise<BlogCategoryOption[]>;
  create(input: BlogPostInput): Promise<ContentWriteResult>;
  update(id: string, input: BlogPostInput): Promise<ContentWriteResult>;
  publish(id: string): Promise<ContentWriteResult>;
  unpublish(id: string): Promise<ContentWriteResult>;
  archive(id: string): Promise<ContentWriteResult>;
  countsByStatus(): Promise<ContentStatusCounts>;
}

export interface CmsCaseRepository {
  listPublished(options?: { limit?: number }): Promise<CaseStudySummary[]>;
  getPublishedBySlug(slug: string): Promise<CaseStudyDetail | null>;
  listAdmin(options?: ContentListOptions): Promise<CaseStudySummary[]>;
  getById(id: string): Promise<CaseStudyDetail | null>;
  create(input: CaseStudyInput): Promise<ContentWriteResult>;
  update(id: string, input: CaseStudyInput): Promise<ContentWriteResult>;
  publish(id: string): Promise<ContentWriteResult>;
  unpublish(id: string): Promise<ContentWriteResult>;
  archive(id: string): Promise<ContentWriteResult>;
  countsByStatus(): Promise<ContentStatusCounts>;
}

/** 後台「頁面管理」：官網固定頁的 route、標題、SEO 與索引狀態 */
export interface CmsPageOverviewItem {
  route: string;
  name: string;
  group: MarketingRouteGroup;
  /** 頁面本身是否允許被索引（noindex 頁為 false） */
  indexable: boolean;
  /** SEO 來源：code = Astro 頁面自帶；cms = seo_metadata 有覆寫 */
  seoSource: 'code' | 'cms';
  seoTitle: string;
  seoDescription: string;
  canonicalOverride: string;
  /** 對應的 cms_pages 資料列（沒有時為 null） */
  cmsPageId: string | null;
  cmsPageStatus: ContentStatus | null;
  updatedAt: string | null;
}

export interface CmsNavigationItemView {
  id: string;
  menuKey: 'header' | 'footer';
  menuName: string;
  label: string;
  href: string;
  sortOrder: number;
  enabled: boolean;
  openInNewTab: boolean;
}

export interface CmsNavigationItemInput {
  label: string;
  href: string;
  sortOrder: number;
  enabled: boolean;
  openInNewTab: boolean;
}

/** 頁面 / 選單 / SEO 總覽（不建立與頁面 metadata 衝突的第二套資料：固定頁 SEO 仍由 Astro 頁面提供，這裡只顯示與覆寫） */
export interface CmsStructureRepository {
  listPages(): Promise<CmsPageOverviewItem[]>;
  listNavigation(): Promise<CmsNavigationItemView[]>;
  updateNavigationItem(id: string, input: CmsNavigationItemInput): Promise<ContentWriteResult>;
}

export type ContentSyncState = 'synced' | 'rebuild_required' | 'building' | 'failed';

export interface ContentSyncStatus {
  state: ContentSyncState;
  lastContentUpdatedAt: string | null;
  lastMarketingBuildAt: string | null;
  pendingReason: string | null;
  /** false：mock 模式，狀態為記憶體暫存 */
  persisted: boolean;
}

/**
 * Marketing rebuild 觸發介面（Phase 2.9 只記錄狀態，不做真正部署）。
 * Phase 3.1 會換成 GitHub Actions / deploy provider webhook，介面不變。
 */
export interface MarketingRebuildTrigger {
  getStatus(): Promise<ContentSyncStatus>;
  /** 內容儲存後呼叫：只記錄「需要重新建置」，不會阻塞表單 */
  trigger(reason: string): Promise<ContentSyncStatus>;
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
  cmsBlog: CmsBlogRepository;
  cmsCases: CmsCaseRepository;
  cmsStructure: CmsStructureRepository;
  marketingRebuild: MarketingRebuildTrigger;
}
