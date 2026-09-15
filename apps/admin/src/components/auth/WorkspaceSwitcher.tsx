import type { WorkspaceMembership } from '@syt/auth';

/**
 * 工作區切換（placeholder）：第一版每個客戶通常只有一個工作區。
 * 多工作區時先列出但停用切換，Phase 3 再以 cookie 記錄目前工作區。
 */
export function WorkspaceSwitcher({ memberships, currentWorkspaceId }: { memberships: WorkspaceMembership[]; currentWorkspaceId?: string | null }) {
  const current = memberships.find((membership) => membership.workspaceId === currentWorkspaceId) ?? memberships[0];
  if (!current) {
    return <p className="truncate text-sm font-semibold text-slate-gray">尚未開通工作區</p>;
  }
  if (memberships.length === 1) {
    return (
      <p className="truncate text-sm font-semibold text-ink" title={current.workspaceName} data-testid="workspace-name">
        {current.workspaceName}
      </p>
    );
  }
  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">目前工作區</span>
      <select
        disabled
        defaultValue={current.workspaceId}
        title="多工作區切換將於下一階段開放"
        className="min-w-0 max-w-full truncate rounded-input border border-border-gray bg-surface px-2 py-1.5 text-sm font-semibold text-ink"
      >
        {memberships.map((membership) => (
          <option key={membership.workspaceId} value={membership.workspaceId}>
            {membership.workspaceName}
          </option>
        ))}
      </select>
    </label>
  );
}
