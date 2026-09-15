/** 與 DB SQL v2.0 enum 對應的共用型別（產生 Supabase types 後以 generated types 為準） */

export type PublishStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type SiteProjectStatus = 'draft' | 'preview' | 'published' | 'suspended' | 'archived';
export type DomainStatus = 'pending' | 'verifying' | 'verified' | 'active' | 'failed' | 'removed';
export type SslStatus = 'not_requested' | 'pending' | 'provisioning' | 'active' | 'failed' | 'expired';
export type DeploymentStatus = 'queued' | 'building' | 'ready' | 'failed' | 'cancelled' | 'skipped';
export type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded' | 'partially_refunded' | 'failed';
export type SubscriptionStatus = 'incomplete' | 'trialing' | 'active' | 'past_due' | 'cancel_scheduled' | 'cancelled' | 'expired';
export type PaymentProvider = 'ecpay' | 'linepay' | 'bank_transfer' | 'manual';
export type ProviderEnvironment = 'sandbox' | 'production';
export type TemplatePricingType = 'free' | 'paid' | 'plan_restricted' | 'private';
export type AiContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'rejected' | 'archived';

export const SITE_PROJECT_STATUS_LABELS: Record<SiteProjectStatus, string> = {
  draft: '草稿',
  preview: '預覽中',
  published: '已發布',
  suspended: '已暫停',
  archived: '已封存',
};

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  pending: '等待設定',
  verifying: '驗證中',
  verified: '已驗證',
  active: '使用中',
  failed: '驗證失敗',
  removed: '已移除',
};

export const SSL_STATUS_LABELS: Record<SslStatus, string> = {
  not_requested: '尚未申請',
  pending: '等待申請',
  provisioning: '簽發中',
  active: '已啟用',
  failed: '簽發失敗',
  expired: '已過期',
};

export const TEMPLATE_PRICING_LABELS: Record<TemplatePricingType, string> = {
  free: '免費',
  paid: '付費',
  plan_restricted: '方案限定',
  private: '私人客製',
};
