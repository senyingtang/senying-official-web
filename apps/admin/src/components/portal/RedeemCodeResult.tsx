import { REDEEM_STATUS_MESSAGES, type RedeemStatus, type RedeemStatusTone } from '@syt/shared';
import type { ReactNode } from 'react';

const boxTone: Record<RedeemStatusTone, string> = {
  success: 'border-success/30 bg-success/10',
  info: 'border-teal/30 bg-teal-soft',
  warning: 'border-warning/30 bg-warning/10',
  danger: 'border-danger/30 bg-danger/10',
};

const titleTone: Record<RedeemStatusTone, string> = {
  success: 'text-success-strong',
  info: 'text-teal-strong',
  warning: 'text-warning-strong',
  danger: 'text-danger-strong',
};

/** 兌換結果（valid / invalid / expired / already_redeemed* / revoked / rate_limited / not_authenticated / server_error） */
export function RedeemCodeResult({ status, action }: { status: RedeemStatus; action?: ReactNode }) {
  const message = REDEEM_STATUS_MESSAGES[status];
  return (
    <div
      role={message.tone === 'danger' || message.tone === 'warning' ? 'alert' : 'status'}
      data-testid="redeem-result"
      data-status={status}
      className={`min-w-0 rounded-xl border px-4 py-3 text-sm text-ink ${boxTone[message.tone]}`}
    >
      <p className={`break-words font-semibold ${titleTone[message.tone]}`}>{message.title}</p>
      <p className="mt-1 break-words">{message.description}</p>
      {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
