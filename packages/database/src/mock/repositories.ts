import { isAccessCodeFormat, normalizeAccessCode } from '@syt/shared';
import type { CustomerSiteSummary } from '../models';
import type { RedeemOutcome, Repositories, RepositoryContext } from '../repositories';
import {
  mockAccessCodes,
  mockAuditLogs,
  mockDeployments,
  mockDomains,
  mockEntitlements,
  mockFormSubmissions,
  mockOrders,
  mockPaymentProviderCards,
  mockPrices,
  mockProducts,
  mockSeoProjects,
  mockSites,
  mockSubscriptions,
  mockTemplateLicenses,
  mockTemplates,
} from './data';
import { getMockMarketingSiteSettings } from '../site-settings';
import { findMockAccountById } from './identities';

const clone = <T>(value: T): T => structuredClone(value);

/**
 * Mock repository：依 viewer 過濾資料，行為對齊 RLS（portal 只看自己的 workspace）。
 * 兌換流程為無狀態模擬：不會真的建立 workspace 或修改代碼狀態。
 */
export function createMockRepositories(context: RepositoryContext = {}): Repositories {
  const viewer = context.viewer;

  function visibleSites(): CustomerSiteSummary[] {
    if (!viewer) return [];
    if (viewer.scope === 'admin') return viewer.adminRole ? mockSites : [];
    return mockSites.filter((site) => viewer.workspaceIds.includes(site.workspaceId));
  }

  function redeem(code: string): RedeemOutcome {
    if (!viewer) return { status: 'not_authenticated' };
    const normalized = normalizeAccessCode(code);
    if (!isAccessCodeFormat(normalized)) return { status: 'invalid', rawResult: 'invalid_format' };
    const found = mockAccessCodes.find((item) => item.code === normalized);
    if (!found) return { status: 'invalid', rawResult: 'not_found' };
    if (found.status === 'revoked') return { status: 'revoked', rawResult: 'revoked' };
    if (found.status === 'expired') return { status: 'expired', rawResult: 'expired' };

    const workspaceId = viewer.workspaceIds[0] ?? null;
    const sites = visibleSites();
    if (found.status === 'redeemed') {
      if (found.redeemerEmail !== viewer.email) return { status: 'already_redeemed_by_other_user', rawResult: 'already_redeemed' };
      const matching = sites.find((site) => (found.productCode === 'LP' ? site.siteType === 'landing_page' : site.siteType === 'seo_website')) ?? sites[0];
      return { status: 'already_redeemed_by_current_user', workspaceId, siteId: matching?.id ?? null, rawResult: 'already_exists' };
    }
    return { status: 'valid', workspaceId, siteId: sites[0]?.id ?? null, rawResult: 'created' };
  }

  return {
    identity: {
      getAdminRole: async (userId) => findMockAccountById(userId)?.adminRole ?? null,
      listWorkspaceMemberships: async (userId) => clone(findMockAccountById(userId)?.memberships ?? []),
    },
    dashboard: {
      async getAdminStats() {
        return [
          { label: '本月訂單', value: String(mockOrders.length), hint: 'Mock 資料' },
          { label: '待兌換代碼', value: String(mockAccessCodes.filter((c) => c.status === 'issued' || c.status === 'generated').length) },
          { label: '客戶網站', value: String(mockSites.length) },
          { label: '啟用中金流', value: String(mockPaymentProviderCards.filter((p) => p.isEnabled).length), hint: 'Phase 1 未串接金流' },
        ];
      },
      async getPortalStats() {
        return [
          { label: '我的網站', value: String(visibleSites().length) },
          { label: '可用網站額度', value: '0', hint: '每組代碼可建立 1 個網站' },
          { label: '新表單紀錄', value: String(mockFormSubmissions.filter((f) => f.status === 'new').length) },
        ];
      },
    },
    accessCodes: {
      list: async () => clone(mockAccessCodes),
      redeem: async (code) => redeem(code),
    },
    commerce: {
      listProducts: async () => clone(mockProducts),
      listPrices: async () => clone(mockPrices),
      listOrders: async () => clone(mockOrders),
      listSubscriptions: async () => clone(mockSubscriptions),
      listPaymentProviderCards: async () => clone(mockPaymentProviderCards),
    },
    customerSites: {
      listSites: async () => clone(visibleSites()),
      getSite: async (siteId) => clone(visibleSites().find((site) => site.id === siteId) ?? null),
      getSiteWorkspaceId: async (siteId) => mockSites.find((site) => site.id === siteId)?.workspaceId ?? null,
      listDomains: async (siteId) => {
        const ids = new Set(visibleSites().map((site) => site.id));
        return clone(mockDomains.filter((domain) => ids.has(domain.siteId) && (!siteId || domain.siteId === siteId)));
      },
      listDeployments: async () => clone(mockDeployments),
      listFormSubmissions: async (siteId) => (visibleSites().some((site) => site.id === siteId) ? clone(mockFormSubmissions) : []),
    },
    templates: {
      listTemplates: async () => clone(mockTemplates),
      listLicenses: async () => clone(mockTemplateLicenses),
    },
    seoGenerator: {
      listProjects: async () => clone(mockSeoProjects),
    },
    settings: {
      listAuditLogs: async () => clone(mockAuditLogs),
    },
    portal: {
      listEntitlements: async () => (viewer && viewer.workspaceIds.length > 0 ? clone(mockEntitlements) : []),
    },
    siteSettings: {
      getMarketingSiteSettings: async () => getMockMarketingSiteSettings(),
      // Mock 模式：驗證通過也不寫入，避免讓人誤以為已儲存到資料庫
      updateMarketingSiteSettings: async () => ({ persisted: false, changedKeys: [], auditLogged: false }),
    },
  };
}
