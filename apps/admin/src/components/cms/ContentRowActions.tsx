import type { ContentStatus } from '@syt/database/cms-content';
import { buttonClass } from '@syt/ui';
import Link from 'next/link';

export interface ContentRowActionsProps {
  id: string;
  status: ContentStatus;
  editHref: string;
  /** server action：以 FormData 取得 id 與 intent */
  action: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  /** false：只能編輯內容，不能切換發布狀態（例如 author）。Server Action 與 RLS 仍會再檢查一次 */
  canPublish?: boolean;
}

/** 列表列的操作：編輯 + 狀態切換（發布 / 取消發布 / 下架） */
export function ContentRowActions({ id, status, editHref, action, canEdit, canPublish = true }: ContentRowActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={editHref} className={buttonClass('secondary', 'sm')}>
        編輯
      </Link>
      {canEdit && canPublish && (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={id} />
          {status !== 'published' && (
            <button type="submit" name="intent" value="publish" className={buttonClass('primary', 'sm')}>
              發布
            </button>
          )}
          {status === 'published' && (
            <button type="submit" name="intent" value="unpublish" className={buttonClass('secondary', 'sm')}>
              取消發布
            </button>
          )}
          {status !== 'archived' && (
            <button type="submit" name="intent" value="archive" className={buttonClass('ghost', 'sm')}>
              下架
            </button>
          )}
        </form>
      )}
    </div>
  );
}
