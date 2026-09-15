/** 森映官方後台角色（DB enum public.cms_admin_role，v1.0 沿用） */
export const CMS_ADMIN_ROLES = ['owner', 'admin', 'editor', 'author', 'viewer'] as const;
export type CmsAdminRole = (typeof CMS_ADMIN_ROLES)[number];

export const CMS_ADMIN_ROLE_LABELS: Record<CmsAdminRole, string> = {
  owner: '擁有者',
  admin: '管理員',
  editor: '編輯',
  author: '作者',
  viewer: '檢視者',
};

/** 客戶 workspace 角色（DB enum public.workspace_member_role） */
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: '擁有者',
  admin: '管理員',
  editor: '編輯',
  viewer: '檢視者',
};
