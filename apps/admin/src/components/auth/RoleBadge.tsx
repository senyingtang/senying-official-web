import { CMS_ADMIN_ROLE_LABELS, WORKSPACE_ROLE_LABELS, type CmsAdminRole, type WorkspaceRole } from '@syt/auth';
import { badgeClass } from '@syt/ui';

export type RoleBadgeProps = { kind: 'admin'; role: CmsAdminRole } | { kind: 'workspace'; role: WorkspaceRole };

export function RoleBadge(props: RoleBadgeProps) {
  const label = props.kind === 'admin' ? CMS_ADMIN_ROLE_LABELS[props.role] : WORKSPACE_ROLE_LABELS[props.role];
  const tone = props.role === 'owner' ? 'dark' : 'teal';
  return (
    <span className={badgeClass(tone)} data-testid="role-badge" data-role={props.role}>
      {label}
    </span>
  );
}
