import type { ContentSyncStatus } from '@syt/database';
import { formatDateTime } from '@syt/shared';
import { cardClass } from '@syt/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

const STATE_LABEL = {
  synced: '已同步',
  rebuild_required: '需要重新建置',
  building: '建置中',
  failed: '建置失敗',
} as const;

const STATE_TONE = { synced: 'success', rebuild_required: 'warning', building: 'teal', failed: 'danger' } as const;

const STATE_HINT = {
  synced: '最後一次官網建置時間晚於最後一次內容更新，官網內容為最新。',
  rebuild_required: '內容已更新，官網（Astro 靜態網站）要重新建置後才會顯示新內容。',
  building: '已送出建置請求，等待完成。',
  failed: '上一次建置失敗，請查看部署紀錄。',
} as const;

/**
 * 官網內容同步狀態。
 * Phase 2.9 只比較「最後內容更新時間」與「最後建置完成時間」，不執行真正的部署；
 * 觸發介面為 MarketingRebuildTrigger，Phase 3.1 會換成 GitHub Actions / deploy provider webhook。
 */
export function RebuildStatusCard({ status }: { status: ContentSyncStatus }) {
  return (
    <section className={`${cardClass} min-w-0`} aria-labelledby="rebuild-status-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rebuild-status-heading" className="text-lg font-bold text-ink">
          網站內容狀態
        </h2>
        <StatusBadge tone={STATE_TONE[status.state]}>{STATE_LABEL[status.state]}</StatusBadge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-gray">{STATE_HINT[status.state]}</p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-slate-gray">最後內容更新</dt>
          <dd className="font-medium text-ink">{formatDateTime(status.lastContentUpdatedAt)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-slate-gray">最後官網建置</dt>
          <dd className="font-medium text-ink">{formatDateTime(status.lastMarketingBuildAt)}</dd>
        </div>
        {status.pendingReason && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-gray">待處理原因</dt>
            <dd className="font-medium text-ink">{status.pendingReason}</dd>
          </div>
        )}
      </dl>
      {!status.persisted && <p className="mt-3 text-xs text-slate-gray">Mock 模式：狀態只保存在記憶體。</p>}
    </section>
  );
}
