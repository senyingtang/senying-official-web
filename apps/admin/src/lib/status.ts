import type {
  AccessCodeStatus,
  DeploymentStatus,
  DomainStatus,
  OrderStatus,
  PaymentStatus,
  ProviderEnvironment,
  SiteProjectStatus,
  SslStatus,
  SubscriptionStatus,
} from '@syt/shared';
import type { BadgeTone } from '@syt/ui';

export const accessCodeTone: Record<AccessCodeStatus, BadgeTone> = {
  generated: 'neutral',
  issued: 'teal',
  redeemed: 'success',
  expired: 'warning',
  revoked: 'danger',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待處理',
  awaiting_payment: '待付款',
  paid: '已付款',
  fulfilled: '已發放',
  cancelled: '已取消',
  refunded: '已退款',
  partially_refunded: '部分退款',
  failed: '付款失敗',
};

export const orderTone: Record<OrderStatus, BadgeTone> = {
  pending: 'neutral',
  awaiting_payment: 'warning',
  paid: 'teal',
  fulfilled: 'success',
  cancelled: 'neutral',
  refunded: 'danger',
  partially_refunded: 'warning',
  failed: 'danger',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '待付款',
  processing: '處理中',
  awaiting_transfer: '等待轉帳',
  succeeded: '付款成功',
  failed: '付款失敗',
  cancelled: '已取消',
  expired: '已逾期',
  refunded: '已退款',
  partially_refunded: '部分退款',
};

export const paymentTone: Record<PaymentStatus, BadgeTone> = {
  pending: 'warning',
  processing: 'teal',
  awaiting_transfer: 'warning',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  expired: 'neutral',
  refunded: 'danger',
  partially_refunded: 'warning',
};

/** sandbox 一律以警示色標示，避免把模擬付款誤看成正式收款 */
export const ENVIRONMENT_LABELS: Record<ProviderEnvironment, string> = {
  sandbox: '沙箱（模擬）',
  production: '正式',
};

export const environmentTone: Record<ProviderEnvironment, BadgeTone> = {
  sandbox: 'warning',
  production: 'success',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  incomplete: '未完成',
  trialing: '試用中',
  active: '使用中',
  past_due: '扣款失敗',
  cancel_scheduled: '期末取消',
  cancelled: '已取消',
  expired: '已到期',
};

export const subscriptionTone: Record<SubscriptionStatus, BadgeTone> = {
  incomplete: 'neutral',
  trialing: 'teal',
  active: 'success',
  past_due: 'danger',
  cancel_scheduled: 'warning',
  cancelled: 'neutral',
  expired: 'neutral',
};

export const siteTone: Record<SiteProjectStatus, BadgeTone> = {
  draft: 'neutral',
  preview: 'teal',
  published: 'success',
  suspended: 'danger',
  archived: 'neutral',
};

export const domainTone: Record<DomainStatus, BadgeTone> = {
  pending: 'warning',
  verifying: 'teal',
  verified: 'success',
  active: 'success',
  failed: 'danger',
  removed: 'neutral',
};

export const sslTone: Record<SslStatus, BadgeTone> = {
  not_requested: 'neutral',
  pending: 'warning',
  provisioning: 'teal',
  active: 'success',
  failed: 'danger',
  expired: 'danger',
};

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  queued: '排隊中',
  building: '建置中',
  ready: '完成',
  failed: '失敗',
  cancelled: '已取消',
  skipped: '略過（預覽模式）',
};

export const deploymentTone: Record<DeploymentStatus, BadgeTone> = {
  queued: 'neutral',
  building: 'teal',
  ready: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  skipped: 'warning',
};
