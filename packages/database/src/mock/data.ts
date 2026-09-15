import type {
  AccessCodeListItem,
  AuditLogItem,
  CustomerSiteSummary,
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
} from '../models';

/**
 * Mock 資料：全部為示範用途。
 * - 不含真實 UUID、真實客戶、正式網域、金流商店代號或密鑰。
 * - email 使用 example.com 保留網域。
 * - 金額為 0（方案價格待業主確認）。
 */

export const mockAccessCodes: AccessCodeListItem[] = [
  { id: 'mock-code-001', code: 'SYT-SEO-2026-A8K3Q9', productCode: 'SEO', planName: 'SEO 形象官網（v1）', status: 'issued', holderEmail: 'buyer@example.com', redeemerEmail: null, createdAt: '2026-09-01T02:10:00Z', redeemedAt: null, expiresAt: '2027-09-01T02:10:00Z' },
  { id: 'mock-code-002', code: 'SYT-LP-2026-P7X2M4', productCode: 'LP', planName: '一頁式網頁（v1）', status: 'redeemed', holderEmail: 'customer@example.com', redeemerEmail: 'customer@example.com', createdAt: '2026-08-20T06:00:00Z', redeemedAt: '2026-08-21T03:30:00Z', expiresAt: '2027-08-20T06:00:00Z' },
  { id: 'mock-code-003', code: 'SYT-ECOM-2026-K9D6R1', productCode: 'ECOM', planName: '電商網站（客製）', status: 'generated', holderEmail: null, redeemerEmail: null, createdAt: '2026-09-05T08:45:00Z', redeemedAt: null, expiresAt: null },
  { id: 'mock-code-004', code: 'SYT-DM-2026-H4M8T2', productCode: 'DM', planName: '活動 DM / 宣傳頁', status: 'expired', holderEmail: 'event@example.com', redeemerEmail: null, createdAt: '2025-08-01T01:00:00Z', redeemedAt: null, expiresAt: '2026-08-01T01:00:00Z' },
  { id: 'mock-code-006', code: 'SYT-SEO-2026-R7T4W2', productCode: 'SEO', planName: 'SEO 形象官網（v1）', status: 'redeemed', holderEmail: 'other-customer@example.com', redeemerEmail: 'other-customer@example.com', createdAt: '2026-08-02T02:00:00Z', redeemedAt: '2026-08-03T02:00:00Z', expiresAt: '2027-08-02T02:00:00Z' },
  { id: 'mock-code-005', code: 'SYT-AI-2026-N3Q8Z5', productCode: 'AI', planName: 'SEO 文章生產器', status: 'revoked', holderEmail: 'writer@example.com', redeemerEmail: null, createdAt: '2026-07-10T04:20:00Z', redeemedAt: null, expiresAt: '2027-07-10T04:20:00Z' },
];

const ecpayFields = [
  { key: 'merchant_id', label: '特店編號 MerchantID', type: 'text', required: true, placeholder: '由綠界提供，請勿填入正式值於 mock 環境' },
  { key: 'hash_key', label: 'HashKey（Vault 參照名稱）', type: 'secret_ref', required: true, placeholder: 'vault:ecpay_sandbox_hash_key', help: '只填參照名稱，實際密鑰存在 Supabase Vault' },
  { key: 'hash_iv', label: 'HashIV（Vault 參照名稱）', type: 'secret_ref', required: true, placeholder: 'vault:ecpay_sandbox_hash_iv' },
  { key: 'notify_path', label: '付款結果通知路徑 ReturnURL', type: 'path', required: true, placeholder: '/api/payments/ecpay/notify' },
] as const;

export const mockPaymentProviderCards: PaymentProviderCardConfig[] = [
  {
    key: 'ecpay',
    provider: 'ecpay',
    title: '綠界 ECPay',
    description: '信用卡、ATM 虛擬帳號、網路 ATM。',
    isEnabled: false,
    environment: 'sandbox',
    supportsEnvironment: true,
    methods: ['信用卡一次付清', 'ATM 虛擬帳號', '網路 ATM'],
    fields: [...ecpayFields],
  },
  {
    key: 'bank_transfer',
    provider: 'bank_transfer',
    title: '銀行轉帳',
    description: '買家轉帳後填寫後五碼，由管理員人工對帳。',
    isEnabled: false,
    environment: 'production',
    supportsEnvironment: false,
    methods: ['銀行轉帳'],
    fields: [
      { key: 'bank_code', label: '銀行代碼', type: 'text', required: true, placeholder: '3 碼數字' },
      { key: 'account_name', label: '戶名', type: 'text', required: true },
      { key: 'account_number', label: '帳號', type: 'text', required: true, help: '只在買家訂單頁顯示' },
      { key: 'transfer_deadline_hours', label: '轉帳期限（小時）', type: 'number', required: true, placeholder: '72' },
    ],
  },
  {
    key: 'linepay',
    provider: 'linepay',
    title: 'LINE Pay',
    description: '導向 LINE Pay 授權付款。',
    isEnabled: false,
    environment: 'sandbox',
    supportsEnvironment: true,
    methods: ['LINE Pay'],
    fields: [
      { key: 'merchant_id', label: 'Channel ID', type: 'text', required: true },
      { key: 'channel_secret', label: 'Channel Secret（Vault 參照名稱）', type: 'secret_ref', required: true, placeholder: 'vault:linepay_sandbox_channel_secret' },
      { key: 'confirm_path', label: '付款確認路徑', type: 'path', required: true, placeholder: '/api/payments/linepay/confirm' },
    ],
  },
  {
    key: 'subscription_monthly',
    provider: 'ecpay',
    title: '月訂閱',
    description: '綠界信用卡定期定額，PeriodType = M。',
    isEnabled: false,
    environment: 'sandbox',
    supportsEnvironment: true,
    methods: ['信用卡定期定額（月）'],
    fields: [
      { key: 'frequency', label: '扣款頻率（Frequency）', type: 'number', required: true, placeholder: '1' },
      { key: 'exec_times', label: '扣款次數上限（ExecTimes，最多 99）', type: 'number', required: true, placeholder: '99' },
      { key: 'grace_period_days', label: '扣款失敗寬限期（天）', type: 'number', required: true, placeholder: '3' },
      { key: 'period_notify_path', label: '定期定額通知路徑', type: 'path', required: true, placeholder: '/api/payments/ecpay/period-notify' },
    ],
  },
  {
    key: 'subscription_yearly',
    provider: 'ecpay',
    title: '年訂閱',
    description: '綠界信用卡定期定額，PeriodType = Y。',
    isEnabled: false,
    environment: 'sandbox',
    supportsEnvironment: true,
    methods: ['信用卡定期定額（年）'],
    fields: [
      { key: 'frequency', label: '扣款頻率（Frequency）', type: 'number', required: true, placeholder: '1' },
      { key: 'exec_times', label: '扣款次數上限（ExecTimes，最多 9）', type: 'number', required: true, placeholder: '9' },
      { key: 'grace_period_days', label: '扣款失敗寬限期（天）', type: 'number', required: true, placeholder: '3' },
      { key: 'period_notify_path', label: '定期定額通知路徑', type: 'path', required: true, placeholder: '/api/payments/ecpay/period-notify' },
    ],
  },
];

export const mockProducts: ProductPlanItem[] = [
  { id: 'mock-product-seo', productCode: 'SEO', name: 'SEO 形象官網方案', status: 'draft', isSelfServe: true, requiresQuote: false },
  { id: 'mock-product-lp', productCode: 'LP', name: '一頁式網頁方案', status: 'draft', isSelfServe: true, requiresQuote: false },
  { id: 'mock-product-ecom', productCode: 'ECOM', name: '電商網站（客製報價）', status: 'draft', isSelfServe: false, requiresQuote: true },
  { id: 'mock-product-dm', productCode: 'DM', name: '活動 DM / 宣傳頁', status: 'draft', isSelfServe: false, requiresQuote: true },
  { id: 'mock-product-ai', productCode: 'AI', name: 'SEO 文章生產器', status: 'draft', isSelfServe: false, requiresQuote: false },
];

export const mockPrices: PriceItem[] = [
  { id: 'mock-price-001', productName: 'SEO 形象官網方案', priceKey: 'seo_website_one_time', interval: 'one_time', amountCents: 0, isActive: false },
  { id: 'mock-price-002', productName: 'SEO 形象官網方案', priceKey: 'seo_website_monthly', interval: 'month', amountCents: 0, isActive: false },
  { id: 'mock-price-003', productName: 'SEO 形象官網方案', priceKey: 'seo_website_yearly', interval: 'year', amountCents: 0, isActive: false },
  { id: 'mock-price-004', productName: '一頁式網頁方案', priceKey: 'landing_page_one_time', interval: 'one_time', amountCents: 0, isActive: false },
  { id: 'mock-price-005', productName: 'SEO 文章生產器', priceKey: 'ai_article_monthly', interval: 'month', amountCents: 0, isActive: false },
];

export const mockOrders: OrderSummary[] = [
  { id: 'mock-order-001', orderNumber: 'ORD-20260901-000001', buyerEmail: 'buyer@example.com', totalCents: 0, status: 'fulfilled', createdAt: '2026-09-01T02:00:00Z' },
  { id: 'mock-order-002', orderNumber: 'ORD-20260910-000002', buyerEmail: 'shop@example.com', totalCents: 0, status: 'awaiting_payment', createdAt: '2026-09-10T09:15:00Z' },
];

export const mockSubscriptions: SubscriptionSummary[] = [
  { id: 'mock-sub-001', planName: 'SEO 形象官網訂閱', customerEmail: 'owner@example.com', interval: 'month', status: 'active', currentPeriodEnd: '2026-10-01T00:00:00Z' },
];

export const mockSites: CustomerSiteSummary[] = [
  { id: 'demo-seo-site', workspaceId: 'mock-workspace-001', name: '示範 SEO 形象官網', siteType: 'seo_website', status: 'preview', workspaceName: '示範工作區', templateName: 'SEO 形象官網｜標準版', previewPath: '/portal/sites/demo-seo-site/preview', updatedAt: '2026-09-12T07:30:00Z' },
  { id: 'demo-landing-page', workspaceId: 'mock-workspace-001', name: '示範課程招生頁', siteType: 'landing_page', status: 'draft', workspaceName: '示範工作區', templateName: '一頁式網頁｜轉換版', previewPath: '/portal/sites/demo-landing-page/preview', updatedAt: '2026-09-13T03:10:00Z' },
  { id: 'other-workspace-site', workspaceId: 'mock-workspace-002', name: '其他客戶的網站', siteType: 'seo_website', status: 'draft', workspaceName: '其他客戶工作區', templateName: 'SEO 形象官網｜標準版', previewPath: '/portal/sites/other-workspace-site/preview', updatedAt: '2026-09-10T08:00:00Z' },
];

export const mockDomains: SiteDomainView[] = [
  { id: 'mock-domain-001', siteId: 'demo-seo-site', domain: 'www.example.com', kind: 'custom_subdomain', status: 'pending', sslStatus: 'not_requested', isPrimary: true, verificationToken: null, lastCheckedAt: null },
];

export const mockDeployments: DeploymentItem[] = [
  { id: 'mock-deploy-001', siteName: '示範 SEO 形象官網', version: 1, status: 'skipped', isDryRun: true, createdAt: '2026-09-12T07:31:00Z' },
];

export const mockTemplates: TemplateSummary[] = [
  { id: 'tpl-seo-starter', name: 'SEO 形象官網｜標準版', siteType: 'seo_website', pricingType: 'free', status: 'draft', description: '首頁、關於、服務、聯絡與隱私權頁，內建 SEO 欄位。', pages: ['首頁', '關於我們', '服務項目', '聯絡我們', '隱私權政策'] },
  { id: 'tpl-landing-basic', name: '一頁式網頁｜轉換版', siteType: 'landing_page', pricingType: 'free', status: 'draft', description: '主視覺、賣點、見證、FAQ 與表單集中在單一頁面。', pages: ['首頁'] },
  { id: 'tpl-coming-soon', name: '更多版型整理中', siteType: 'seo_website', pricingType: 'paid', status: 'draft', description: '付費版型與方案限定版型將在版型商店開放。', pages: [] },
];

export const mockTemplateLicenses: TemplateLicenseItem[] = [];

export const mockSeoProjects: SeoGeneratorProjectItem[] = [
  { id: 'mock-ai-project-001', name: '森映官網文章規劃', scope: 'internal', keywordCount: 12, latestOutputStatus: 'draft', updatedAt: '2026-09-11T05:00:00Z' },
];

export const mockAuditLogs: AuditLogItem[] = [
  { id: 'mock-audit-001', actorEmail: 'owner@example.com', actorType: 'admin', action: 'order.mark_paid_and_issue', entityType: 'commerce_orders', createdAt: '2026-09-01T02:05:00Z' },
  { id: 'mock-audit-002', actorEmail: 'owner@example.com', actorType: 'customer', action: 'access_code.redeem', entityType: 'access_codes', createdAt: '2026-08-21T03:30:00Z' },
];

export const mockEntitlements: PortalEntitlementItem[] = [
  { id: 'mock-ent-001', planName: 'SEO 形象官網（v1）', productCode: 'SEO', status: 'active', siteQuotaUsed: 1, siteQuotaLimit: 1, expiresAt: null },
  { id: 'mock-ent-002', planName: '一頁式網頁（v1）', productCode: 'LP', status: 'active', siteQuotaUsed: 1, siteQuotaLimit: 1, expiresAt: null },
];

export const mockFormSubmissions: FormSubmissionItem[] = [
  { id: 'mock-form-001', formName: '聯絡表單', summary: '想了解課程時間與費用', status: 'new', createdAt: '2026-09-13T10:20:00Z' },
];
