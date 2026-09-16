import { CONTENT_STATUS_LABELS, CONTENT_STATUSES } from '@syt/database/cms-content';
import { buttonClass, inputClass } from '@syt/ui';
import Link from 'next/link';

export interface ContentToolbarFilter {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}

export interface ContentToolbarProps {
  action: string;
  search: string;
  status: string;
  /** 額外的下拉篩選（分類 / 產業 / 精選） */
  filters?: ContentToolbarFilter[];
}

export const STATUS_FILTER_OPTIONS = [{ value: 'all', label: '全部狀態' }, ...CONTENT_STATUSES.map((value) => ({ value, label: CONTENT_STATUS_LABELS[value] }))];

/** 內容列表的搜尋與篩選（GET 表單，狀態放在網址上，重新整理與分享連結都能保留條件） */
export function ContentToolbar({ action, search, status, filters = [] }: ContentToolbarProps) {
  return (
    <form method="get" action={action} className="mb-4 flex min-w-0 flex-col gap-3 rounded-card border border-border-gray bg-surface p-4 md:flex-row md:flex-wrap md:items-end">
      <label className="grid min-w-0 flex-1 content-start gap-1.5 md:min-w-56">
        <span className="text-sm font-medium text-ink">搜尋</span>
        <input type="search" name="q" defaultValue={search} placeholder="標題、slug 或摘要" className={inputClass} />
      </label>
      <label className="grid min-w-0 content-start gap-1.5 md:w-44">
        <span className="text-sm font-medium text-ink">狀態</span>
        <select name="status" defaultValue={status} className={inputClass}>
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {filters.map((filter) => (
        <label key={filter.name} className="grid min-w-0 content-start gap-1.5 md:w-44">
          <span className="text-sm font-medium text-ink">{filter.label}</span>
          <select name={filter.name} defaultValue={filter.value} className={inputClass}>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex gap-2">
        <button type="submit" className={buttonClass('primary', 'md')}>
          套用
        </button>
        <Link href={action} className={buttonClass('secondary', 'md')}>
          清除
        </Link>
      </div>
    </form>
  );
}
