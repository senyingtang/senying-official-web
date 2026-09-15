import { Notice } from '@/components/ui/Notice';

/**
 * 唯讀提示：角色可以進入頁面但不能寫入。
 * 只是 UI 提示；寫入權限仍由 Server Action 與資料庫 RLS 把關。
 */
export function PermissionNotice({ roleLabel, note }: { roleLabel: string; note?: string }) {
  return (
    <div data-testid="permission-notice" className="min-w-0 break-words">
      <Notice tone="warning" title="目前為唯讀模式">
        你的角色（{roleLabel}）可以查看這個頁面，但不能新增、修改或刪除。{note ? ` ${note}` : ''}
      </Notice>
    </div>
  );
}
