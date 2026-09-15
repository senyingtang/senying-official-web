import { cn } from '@syt/shared';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface DataTableColumn {
  key: string;
  label: string;
  className?: string;
}

export type DataTableRow = { id: string } & Record<string, ReactNode>;

export interface DataTablePlaceholderProps {
  columns: DataTableColumn[];
  rows?: DataTableRow[];
  caption: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** 表格最小寬度；超出時只在表格容器內水平捲動，頁面本身不捲動 */
  minWidth?: number;
  footnote?: string;
}

export function DataTablePlaceholder({
  columns,
  rows = [],
  caption,
  emptyTitle = '目前沒有資料',
  emptyDescription,
  minWidth = 720,
  footnote = 'Phase 1 顯示 mock 資料，尚未連線資料庫。',
}: DataTablePlaceholderProps) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="min-w-0 rounded-card border border-border-gray bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-mist-white text-xs text-slate-gray">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-gray">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 align-top text-ink', column.className)}>
                    {row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnote && <p className="border-t border-border-gray px-4 py-2 text-xs text-slate-gray">{footnote}</p>}
    </div>
  );
}
