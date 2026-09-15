import type { SupabaseClient } from '@supabase/supabase-js';
import type { CmsAdminRole, WorkspaceMembership, WorkspaceRole } from '@syt/auth';
import { CMS_ADMIN_ROLES, WORKSPACE_ROLES } from '@syt/auth';
import {
  isAccessCodeFormat,
  mapRedeemResultToStatus,
  normalizeAccessCode,
  PRODUCT_CODES,
  SITE_TYPES,
  type AccessCodeStatus,
  type DomainKind,
  type DomainStatus,
  type ProductCode,
  type SiteProjectStatus,
  type SiteType,
  type SslStatus,
  type TemplatePricingType,
} from '@syt/shared';
import type { AccessCodeListItem, CustomerSiteSummary, PortalEntitlementItem, SiteDomainView, TemplateSummary } from '../models';
import type { Repositories, RepositoryContext } from '../repositories';
import { SITE_SETTING_KEYS, siteSettingsFromRows, siteSettingsToRows } from '../site-settings';
import { TABLES } from '../tables';
import { NotImplementedInPhaseError, SupabasePermissionError, unwrap } from './errors';
import { rpcCreateWorkspaceFromAccessCode } from './rpc';

type JsonRecord = Record<string, unknown>;
const jsonRecord = (value: unknown): JsonRecord => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {});
/** key 排序後序列化，用於判斷 JSON 內容是否變更 */
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item as JsonRecord).sort(([a], [b]) => a.localeCompare(b))) : item,
  );
/** 設定已寫入但 audit log 失敗：不回報為儲存失敗，只在伺服器端留下可追查的紀錄（不含內容） */
const unwrapAuditWarning = (operation: string, code: string | null): void => {
  console.error(`[${operation}.audit] audit log insert failed (code=${code ?? 'unknown'})`);
};

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const nullableStr = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data.filter((item) => item && typeof item === 'object') as Row[]) : []);
/** PostgREST embed 可能是物件或陣列 */
const embedded = (value: unknown): Row | null => {
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value && typeof value === 'object' ? (value as Row) : null;
};
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
/** DB 主鍵為 uuid；非 uuid 的 siteId 直接視為不存在，避免 PostgREST 型別錯誤 */
const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const SITE_SELECT = 'id, workspace_id, name, site_type, status, updated_at, workspace:customer_workspaces(name), template:site_templates(name)';

function toSite(row: Row): CustomerSiteSummary {
  const id = str(row.id);
  return {
    id,
    workspaceId: str(row.workspace_id),
    name: str(row.name),
    siteType: oneOf<SiteType>(row.site_type, SITE_TYPES, 'seo_website'),
    status: oneOf<SiteProjectStatus>(row.status, ['draft', 'preview', 'published', 'suspended', 'archived'], 'draft'),
    workspaceName: str(embedded(row.workspace)?.name),
    templateName: str(embedded(row.template)?.name, '—'),
    previewPath: `/portal/sites/${id}/preview`,
    updatedAt: str(row.updated_at),
  };
}

type CountResult = { count: number | null; error: { message: string; code?: string } | null };

/**
 * Supabase repository（Phase 2：auth / access code / workspace / site project）。
 * client 必須是「使用者 session」client，資料範圍由 RLS 決定；portal scope 另外以 workspaceIds 限制。
 */
export function createSupabaseRepositories(client: SupabaseClient, context: RepositoryContext = {}): Repositories {
  const viewer = context.viewer;
  /** portal scope：RLS 之外再限制在使用者加入的 workspace（森映 admin 在客戶後台也只看自己的 workspace） */
  const portalWorkspaceIds = viewer?.scope === 'portal' ? viewer.workspaceIds : null;
  const notYet = (operation: string) => async (): Promise<never> => {
    throw new NotImplementedInPhaseError(operation);
  };
  const count = async (operation: string, query: PromiseLike<CountResult>): Promise<string> => {
    const result = await query;
    unwrap(`dashboard.count.${operation}`, { data: null, error: result.error });
    return String(result.count ?? 0);
  };
  const head = { count: 'exact', head: true } as const;

  return {
    identity: {
      async getAdminRole(userId) {
        const data = unwrap(
          'identity.getAdminRole',
          await client.from(TABLES.cms.adminProfiles).select('role, is_active').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        );
        const role = embedded(data)?.role;
        return typeof role === 'string' && (CMS_ADMIN_ROLES as readonly string[]).includes(role) ? (role as CmsAdminRole) : null;
      },
      async listWorkspaceMemberships(userId) {
        const data = unwrap(
          'identity.listWorkspaceMemberships',
          await client
            .from(TABLES.workspace.members)
            .select('workspace_id, role, workspace:customer_workspaces(name, status)')
            .eq('user_id', userId)
            .eq('status', 'active'),
        );
        return rows(data)
          .filter((row) => str(embedded(row.workspace)?.status, 'active') !== 'archived')
          .map<WorkspaceMembership>((row) => ({
            workspaceId: str(row.workspace_id),
            workspaceName: str(embedded(row.workspace)?.name, '工作區'),
            role: oneOf<WorkspaceRole>(row.role, WORKSPACE_ROLES, 'viewer'),
          }));
      },
    },

    dashboard: {
      async getAdminStats() {
        const [orders, codes, sites, providers] = await Promise.all([
          count('orders', client.from(TABLES.commerce.orders).select('id', head)),
          count('accessCodes', client.from(TABLES.entitlement.accessCodes).select('id', head).in('status', ['generated', 'issued'])),
          count('sites', client.from(TABLES.siteBuilder.projects).select('id', head)),
          count('providers', client.from(TABLES.commerce.providerConfigs).select('id', head).eq('is_enabled', true)),
        ]);
        return [
          { label: '訂單', value: orders },
          { label: '待兌換代碼', value: codes },
          { label: '客戶網站', value: sites },
          { label: '啟用中金流', value: providers },
        ];
      },
      async getPortalStats() {
        const sites =
          portalWorkspaceIds && portalWorkspaceIds.length > 0
            ? await count('portalSites', client.from(TABLES.siteBuilder.projects).select('id', head).in('workspace_id', portalWorkspaceIds))
            : '0';
        return [
          { label: '我的網站', value: sites },
          { label: '可用網站額度', value: '—', hint: '額度明細請見方案權限' },
          { label: '新表單紀錄', value: '—', hint: 'Phase 3 接線' },
        ];
      },
    },

    accessCodes: {
      async list() {
        const data = unwrap(
          'accessCodes.list',
          await client
            .from(TABLES.entitlement.accessCodes)
            .select('id, code, product_code, status, issued_to_email, created_at, redeemed_at, expires_at, entitlement:entitlement_products(name)')
            .order('created_at', { ascending: false })
            .limit(100),
        );
        return rows(data).map<AccessCodeListItem>((row) => ({
          id: str(row.id),
          code: str(row.code),
          productCode: oneOf<ProductCode>(row.product_code, PRODUCT_CODES, 'CUSTOM'),
          planName: str(embedded(row.entitlement)?.name, '—'),
          status: oneOf<AccessCodeStatus>(row.status, ['generated', 'issued', 'redeemed', 'expired', 'revoked'], 'generated'),
          holderEmail: nullableStr(row.issued_to_email),
          redeemerEmail: null, // 兌換者只存 redeemed_by_user_id；Phase 3 以 customer_profiles 顯示
          createdAt: str(row.created_at),
          redeemedAt: nullableStr(row.redeemed_at),
          expiresAt: nullableStr(row.expires_at),
        }));
      },
      async redeem(code) {
        if (!viewer) return { status: 'not_authenticated' };
        const normalized = normalizeAccessCode(code);
        if (!isAccessCodeFormat(normalized)) return { status: 'invalid', rawResult: 'invalid_format' };
        const rpc = await rpcCreateWorkspaceFromAccessCode(client, normalized);
        const status = mapRedeemResultToStatus(rpc.result, 'create_workspace_from_access_code');
        if (status !== 'valid' && status !== 'already_redeemed_by_current_user') return { status, rawResult: rpc.result };
        let siteId: string | null = null;
        if (rpc.workspaceId) {
          const site = unwrap(
            'accessCodes.redeem.firstSite',
            await client.from(TABLES.siteBuilder.projects).select('id').eq('workspace_id', rpc.workspaceId).order('created_at').limit(1).maybeSingle(),
          );
          siteId = nullableStr(embedded(site)?.id);
        }
        return { status, workspaceId: rpc.workspaceId, siteId, rawResult: rpc.result };
      },
    },

    commerce: {
      listProducts: notYet('commerce.listProducts'),
      listPrices: notYet('commerce.listPrices'),
      listOrders: notYet('commerce.listOrders'),
      listSubscriptions: notYet('commerce.listSubscriptions'),
      listPaymentProviderCards: notYet('commerce.listPaymentProviderCards'),
    },

    customerSites: {
      async listSites() {
        if (portalWorkspaceIds?.length === 0) return [];
        let query = client.from(TABLES.siteBuilder.projects).select(SITE_SELECT);
        if (portalWorkspaceIds) query = query.in('workspace_id', portalWorkspaceIds);
        const data = unwrap('customerSites.listSites', await query.order('updated_at', { ascending: false }));
        return rows(data).map(toSite);
      },
      async getSite(siteId) {
        if (!isUuid(siteId) || portalWorkspaceIds?.length === 0) return null;
        let query = client.from(TABLES.siteBuilder.projects).select(SITE_SELECT).eq('id', siteId);
        if (portalWorkspaceIds) query = query.in('workspace_id', portalWorkspaceIds);
        const row = embedded(unwrap('customerSites.getSite', await query.maybeSingle()));
        return row ? toSite(row) : null;
      },
      async getSiteWorkspaceId(siteId) {
        if (!isUuid(siteId)) return null;
        // RLS：看不到的網站回傳 null，不透露網站是否存在
        const data = unwrap('customerSites.getSiteWorkspaceId', await client.from(TABLES.siteBuilder.projects).select('workspace_id').eq('id', siteId).maybeSingle());
        return nullableStr(embedded(data)?.workspace_id);
      },
      async listDomains(siteId) {
        if ((siteId !== undefined && !isUuid(siteId)) || portalWorkspaceIds?.length === 0) return [];
        let query = client
          .from(TABLES.domain.domains)
          .select('id, site_project_id, workspace_id, domain, domain_type, status, is_primary, verification_token, last_checked_at, ssl:site_ssl_certificates(status)')
          .neq('status', 'removed');
        if (portalWorkspaceIds) query = query.in('workspace_id', portalWorkspaceIds);
        if (siteId) query = query.eq('site_project_id', siteId);
        const data = unwrap('customerSites.listDomains', await query);
        return rows(data).map<SiteDomainView>((row) => ({
          id: str(row.id),
          siteId: str(row.site_project_id),
          domain: str(row.domain),
          kind: oneOf<DomainKind>(row.domain_type, ['platform_subdomain', 'custom_subdomain', 'custom_apex'], 'custom_subdomain'),
          status: oneOf<DomainStatus>(row.status, ['pending', 'verifying', 'verified', 'active', 'failed', 'removed'], 'pending'),
          sslStatus: oneOf<SslStatus>(embedded(row.ssl)?.status, ['not_requested', 'pending', 'provisioning', 'active', 'failed', 'expired'], 'not_requested'),
          isPrimary: row.is_primary === true,
          verificationToken: nullableStr(row.verification_token),
          lastCheckedAt: nullableStr(row.last_checked_at),
        }));
      },
      listDeployments: notYet('customerSites.listDeployments'),
      listFormSubmissions: notYet('customerSites.listFormSubmissions'),
    },

    templates: {
      async listTemplates() {
        const data = unwrap(
          'templates.listTemplates',
          await client.from(TABLES.template.templates).select('id, name, site_type, pricing_type, status, short_description').order('sort_order'),
        );
        return rows(data).map<TemplateSummary>((row) => ({
          id: str(row.id),
          name: str(row.name),
          siteType: oneOf<SiteType>(row.site_type, SITE_TYPES, 'seo_website'),
          pricingType: oneOf<TemplatePricingType>(row.pricing_type, ['free', 'paid', 'plan_restricted', 'private'], 'free'),
          status: row.status === 'published' ? 'published' : 'draft',
          description: str(row.short_description),
          pages: [],
        }));
      },
      listLicenses: notYet('templates.listLicenses'),
    },

    seoGenerator: {
      listProjects: notYet('seoGenerator.listProjects'),
    },

    settings: {
      listAuditLogs: notYet('settings.listAuditLogs'),
    },

    siteSettings: {
      async getMarketingSiteSettings() {
        const data = unwrap(
          'siteSettings.getMarketingSiteSettings',
          await client.from(TABLES.cms.siteSettings).select('setting_key, setting_value').in('setting_key', Object.values(SITE_SETTING_KEYS)),
        );
        return siteSettingsFromRows(rows(data).map((row) => ({ setting_key: str(row.setting_key), setting_value: row.setting_value })));
      },
      async updateMarketingSiteSettings(settings) {
        const operation = 'siteSettings.updateMarketingSiteSettings';
        const keys: string[] = Object.values(SITE_SETTING_KEYS);
        const current = rows(unwrap(`${operation}.read`, await client.from(TABLES.cms.siteSettings).select('setting_key, setting_value').in('setting_key', keys)));
        const existing = new Map(current.map((row) => [str(row.setting_key), jsonRecord(row.setting_value)]));

        // 保留表單沒有的既有欄位（例如 0016 seed 的 tagline），表單欄位覆蓋；只寫入內容有變更的設定列
        const next = siteSettingsToRows(settings).map((row) => ({
          setting_key: row.setting_key,
          is_public: row.is_public,
          setting_value: { ...(existing.get(row.setting_key) ?? {}), ...row.setting_value },
          updated_by: viewer?.userId ?? null,
        }));
        const changed = next.filter((row) => !existing.has(row.setting_key) || stableJson(existing.get(row.setting_key)) !== stableJson(row.setting_value));
        const changedKeys = changed.map((row) => row.setting_key);
        if (changed.length === 0) return { persisted: true, changedKeys, auditLogged: false };

        // RLS：cms_site_settings_admin_manage 只允許 owner / admin；被 using 條件擋下時不會報錯而是 0 列，以回傳列數確認
        const written = rows(unwrap(operation, await client.from(TABLES.cms.siteSettings).upsert(changed, { onConflict: 'setting_key' }).select('setting_key')));
        if (written.length !== changed.length) throw new SupabasePermissionError(operation);

        // audit_logs（audit_staff_insert：後台成員以自己身分新增 admin 紀錄）；只記錄設定內容與變更的 key，不含 token / key
        let auditLogged = false;
        if (viewer?.userId) {
          const audit = await client.from(TABLES.cms.auditLogs).insert({
            actor_id: viewer.userId,
            actor_type: 'admin',
            action: 'site_settings.update',
            entity_type: TABLES.cms.siteSettings,
            before_data: Object.fromEntries(changedKeys.map((key) => [key, existing.get(key) ?? null])),
            after_data: Object.fromEntries(changed.map((row) => [row.setting_key, row.setting_value])),
            metadata: { changed_keys: changedKeys, source: 'admin/cms/site-settings', changed_at: new Date().toISOString() },
          });
          auditLogged = !audit.error;
          if (audit.error) unwrapAuditWarning(operation, audit.error.code ?? null);
        }
        return { persisted: true, changedKeys, auditLogged };
      },
    },

    portal: {
      async listEntitlements() {
        if (!portalWorkspaceIds || portalWorkspaceIds.length === 0) return [];
        const data = unwrap(
          'portal.listEntitlements',
          await client
            .from(TABLES.entitlement.userEntitlements)
            .select('id, status, expires_at, product:entitlement_products(name, product_code), quotas:entitlement_usage_quotas(usage_key, quota_limit, quota_used)')
            .in('workspace_id', portalWorkspaceIds),
        );
        return rows(data).map<PortalEntitlementItem>((row) => {
          const product = embedded(row.product);
          const quota = rows(row.quotas).find((item) => item.usage_key === 'site.create');
          return {
            id: str(row.id),
            planName: str(product?.name, '—'),
            productCode: oneOf<ProductCode>(product?.product_code, PRODUCT_CODES, 'CUSTOM'),
            status: oneOf<PortalEntitlementItem['status']>(row.status, ['active', 'expired', 'revoked', 'suspended'], 'active'),
            siteQuotaUsed: typeof quota?.quota_used === 'number' ? quota.quota_used : 0,
            siteQuotaLimit: typeof quota?.quota_limit === 'number' ? quota.quota_limit : null,
            expiresAt: nullableStr(row.expires_at),
          };
        });
      },
    },
  };
}
