import type {
  AccessCodeStatus,
  AiContentStatus,
  BillingInterval,
  DeploymentStatus,
  DomainKind,
  DomainStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ProductCode,
  ProviderEnvironment,
  SiteProjectStatus,
  SiteType,
  SslStatus,
  SubscriptionStatus,
  TemplatePricingType,
} from '@syt/shared';

/** 後台畫面使用的 view model（不直接暴露資料表 Row） */

export interface DashboardStat {
  label: string;
  value: string;
  hint?: string;
}

export interface AccessCodeListItem {
  id: string;
  code: string;
  productCode: ProductCode;
  planName: string;
  status: AccessCodeStatus;
  holderEmail: string | null;
  redeemerEmail: string | null;
  createdAt: string;
  redeemedAt: string | null;
  expiresAt: string | null;
}

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'secret_ref' | 'path' | 'number' | 'boolean';
  required: boolean;
  placeholder?: string;
  help?: string;
}

/** 金流設定卡片的識別字串（mock 為固定值；supabase 模式為 `${provider}-${environment}`） */
export type PaymentProviderCardKey = string;

export interface PaymentProviderCardConfig {
  key: PaymentProviderCardKey;
  provider: PaymentProvider;
  title: string;
  description: string;
  isEnabled: boolean;
  environment: ProviderEnvironment;
  supportsEnvironment: boolean;
  methods: string[];
  fields: ProviderField[];
}

export interface ProductPlanItem {
  id: string;
  productCode: ProductCode;
  name: string;
  status: 'draft' | 'published';
  isSelfServe: boolean;
  requiresQuote: boolean;
}

export interface PriceItem {
  id: string;
  productName: string;
  priceKey: string;
  interval: BillingInterval;
  amountCents: number;
  isActive: boolean;
}

/** 後台訂單列表（Phase 3.0：接 commerce_orders 真實資料） */
export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  itemCount: number;
  paymentStatus: PaymentStatus | null;
  paymentProvider: PaymentProvider | null;
  paymentEnvironment: ProviderEnvironment | null;
  accessCodeCount: number;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrderItemLine {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  totalCents: number;
  isTestPrice: boolean;
}

export interface AdminPaymentLine {
  id: string;
  provider: PaymentProvider;
  methodType: string;
  environment: ProviderEnvironment;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  merchantTradeNo: string | null;
  providerTradeNo: string | null;
  failureMessage: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrderAuditLine {
  id: string;
  action: string;
  actorType: string;
  createdAt: string;
  summary: string;
}

/** 權限代碼在後台只顯示遮罩後的值（完整代碼只給已付款的客戶） */
export interface AdminOrderEntitlementLine {
  id: string;
  maskedCode: string;
  productCode: ProductCode;
  status: AccessCodeStatus;
  issuedToEmail: string | null;
  expiresAt: string | null;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  source: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerCompany: string | null;
  buyerTaxId: string | null;
  adminNote: string | null;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  entitlementsIssuedAt: string | null;
  items: AdminOrderItemLine[];
  payments: AdminPaymentLine[];
  entitlements: AdminOrderEntitlementLine[];
  auditTrail: AdminOrderAuditLine[];
}

export interface OrderStatusCounts {
  total: number;
  paid: number;
  awaitingPayment: number;
  failed: number;
  grossPaidCents: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  buyerEmail: string;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
}

export interface SubscriptionSummary {
  id: string;
  planName: string;
  customerEmail: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export interface CustomerSiteSummary {
  id: string;
  workspaceId: string;
  name: string;
  siteType: SiteType;
  status: SiteProjectStatus;
  workspaceName: string;
  templateName: string;
  previewPath: string;
  updatedAt: string;
}

export interface SiteDomainView {
  id: string;
  siteId: string;
  domain: string;
  kind: DomainKind;
  status: DomainStatus;
  sslStatus: SslStatus;
  isPrimary: boolean;
  verificationToken: string | null;
  lastCheckedAt: string | null;
}

export interface DeploymentItem {
  id: string;
  siteName: string;
  version: number;
  status: DeploymentStatus;
  isDryRun: boolean;
  createdAt: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  siteType: SiteType;
  pricingType: TemplatePricingType;
  status: 'draft' | 'published';
  description: string;
  pages: string[];
}

export interface TemplateLicenseItem {
  id: string;
  templateName: string;
  workspaceName: string;
  sourceType: 'purchase' | 'plan' | 'private_owner' | 'admin_grant';
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
}

export interface SeoGeneratorProjectItem {
  id: string;
  name: string;
  scope: 'internal' | 'customer';
  keywordCount: number;
  latestOutputStatus: AiContentStatus | null;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorEmail: string | null;
  actorType: 'admin' | 'customer' | 'system' | 'webhook';
  action: string;
  entityType: string;
  createdAt: string;
}

export interface PortalEntitlementItem {
  id: string;
  planName: string;
  productCode: ProductCode;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  siteQuotaUsed: number;
  siteQuotaLimit: number | null;
  expiresAt: string | null;
}

export interface FormSubmissionItem {
  id: string;
  formName: string;
  summary: string;
  status: 'new' | 'read' | 'replied' | 'archived' | 'spam';
  createdAt: string;
}
