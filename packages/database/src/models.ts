import type {
  AccessCodeStatus,
  AiContentStatus,
  BillingInterval,
  DeploymentStatus,
  DomainKind,
  DomainStatus,
  OrderStatus,
  PaymentProvider,
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

export type PaymentProviderCardKey = 'ecpay' | 'bank_transfer' | 'linepay' | 'subscription_monthly' | 'subscription_yearly';

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
