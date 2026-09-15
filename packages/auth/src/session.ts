import type { AuthErrorCode } from './redirects';
import type { CmsAdminRole, WorkspaceRole } from './roles';

/** 登入表單 Server Action 狀態（成功時直接 redirect，不回傳） */
export interface LoginFormState {
  error: AuthErrorCode | null;
  email: string;
}

/** mock：本機示範帳號（簽章 cookie）；supabase：Supabase Auth session cookie */
export type AuthMode = 'mock' | 'supabase';

/** 只放顯示需要的欄位；不包含 token 或權限明細 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
}

export interface AdminSession {
  mode: AuthMode;
  user: AuthUser;
  role: CmsAdminRole;
}

export interface PortalSession {
  mode: AuthMode;
  user: AuthUser;
  memberships: WorkspaceMembership[];
}
