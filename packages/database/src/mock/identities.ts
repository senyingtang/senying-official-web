import type { CmsAdminRole, WorkspaceMembership } from '@syt/auth';

/**
 * Mock 帳號（僅 DATA_SOURCE=mock）。
 * email 使用 example.com 保留網域；id 為可讀字串，不是真實 UUID。
 */
export interface MockAccount {
  id: string;
  email: string;
  displayName: string;
  adminRole: CmsAdminRole | null;
  memberships: WorkspaceMembership[];
  description: string;
}

export const MOCK_WORKSPACES = {
  primary: { workspaceId: 'mock-workspace-001', workspaceName: '示範工作區' },
  other: { workspaceId: 'mock-workspace-002', workspaceName: '其他客戶工作區' },
} as const;

export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  { id: 'mock-user-owner', email: 'owner@example.com', displayName: '示範 Owner', adminRole: 'owner', memberships: [], description: '官方後台：全部功能' },
  { id: 'mock-user-admin', email: 'admin@example.com', displayName: '示範 Admin', adminRole: 'admin', memberships: [], description: '官方後台：全部功能（帳號管理唯讀）' },
  { id: 'mock-user-editor', email: 'editor@example.com', displayName: '示範 Editor', adminRole: 'editor', memberships: [], description: '官方後台：CMS、客戶網站、文章' },
  { id: 'mock-user-author', email: 'author@example.com', displayName: '示範 Author', adminRole: 'author', memberships: [], description: '官方後台：文章與內容草稿' },
  { id: 'mock-user-viewer', email: 'viewer@example.com', displayName: '示範 Viewer', adminRole: 'viewer', memberships: [], description: '官方後台：儀表板唯讀' },
  {
    id: 'mock-user-customer',
    email: 'customer@example.com',
    displayName: '示範客戶',
    adminRole: null,
    memberships: [{ ...MOCK_WORKSPACES.primary, role: 'owner' }],
    description: '客戶後台：示範工作區 owner',
  },
  {
    id: 'mock-user-other-customer',
    email: 'other-customer@example.com',
    displayName: '其他客戶',
    adminRole: null,
    memberships: [{ ...MOCK_WORKSPACES.other, role: 'owner' }],
    description: '客戶後台：其他工作區（驗證跨 workspace 隔離）',
  },
  { id: 'mock-user-outsider', email: 'outsider@example.com', displayName: '未開通帳號', adminRole: null, memberships: [], description: '已登入但沒有後台角色與工作區' },
];

export function findMockAccountByEmail(email: string): MockAccount | null {
  const normalized = email.trim().toLowerCase();
  return MOCK_ACCOUNTS.find((account) => account.email === normalized) ?? null;
}

export function findMockAccountById(id: string): MockAccount | null {
  return MOCK_ACCOUNTS.find((account) => account.id === id) ?? null;
}
