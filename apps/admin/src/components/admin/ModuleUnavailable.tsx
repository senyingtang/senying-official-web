import { cardClass } from '@syt/ui';
import type { LoadFailureReason } from '@/lib/safe-load';
import { StatusBadge } from '@/components/ui/StatusBadge';

const REASON_TEXT: Record<LoadFailureReason, { badge: string; tone: 'neutral' | 'warning' | 'danger'; message: string }> = {
  not_implemented: { badge: '尚未啟用', tone: 'neutral', message: '這個模組將於後續階段接入資料庫，目前沒有可顯示的資料。' },
  permission: { badge: '權限不足', tone: 'warning', message: '你的角色沒有檢視這個模組的權限。' },
  error: { badge: '載入失敗', tone: 'danger', message: '資料載入失敗，其他模組不受影響；請稍後再試。' },
};

/**
 * 模組無法載入時的替代內容。
 * 絕不顯示假數字：沒有真實資料時明確說明原因，讓其他 widget 繼續正常運作。
 */
export function ModuleUnavailable({ title, reason, note }: { title: string; reason: LoadFailureReason; note?: string }) {
  const text = REASON_TEXT[reason];
  return (
    <section className={`${cardClass} min-w-0`} data-module-unavailable={reason} aria-label={`${title}（${text.badge}）`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <StatusBadge tone={text.tone}>{text.badge}</StatusBadge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-gray">{note ?? text.message}</p>
    </section>
  );
}
